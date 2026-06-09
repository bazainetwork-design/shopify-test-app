import { Buffer } from 'node:buffer';
import { authenticate } from "../shopify.server.js";
import prisma from '../db.server.js'
import { successResponse, errorResponse } from '../utils/response.server.js'

// stageUploadsCreate: 让Shopify 给你一个上传地址
const STAGED_UPLOADS_CREATE_MUTATION = `
  mutation stagedUploadsCreateForCommentImage($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }

`
// fileCreate：把 staged upload 变成正式的 File（MediaImage）
const FILE_CREATE_MUTATION = `
  mutation fileCreateForReviewImage($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        ... on MediaImage {
          id
          alt
          image {
            url
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function action({ request }) {
  try {

    if (request.method !== 'POST') {
      return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const { admin } = await authenticate.public.appProxy(request);
    const formData = await request.formData();
    const imageFile = formData.get("image");
    const customerId = formData.get("customerId");
    
    if (!imageFile) {
      return errorResponse({ message: 'NO_FILE', status: 400 });
    }

    // 未登录不允许上传
    if (!customerId) {
      return errorResponse({ message: "请先登录", status: 401 });
    }
  
    // 进一步验证 customerId 是否真实存在（防伪造）
    const customer = await admin.graphql(`
      query { customer(id: "gid://shopify/Customer/${customerId}") { id } }
    `);
    
    if (!customer.data.customer) {
      return errorResponse({ message: "用户不存在", status: 403 });
    }
  
    // 检查 MIME 类型
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(imageFile.type)) {
      return errorResponse({ message: "只允许上传图片", status: 400 });
    }
  
    // 检查文件大小（限制 5MB）
    const MAX_SIZE = 5 * 1024 * 1024;
    if (imageFile.size > MAX_SIZE) {
      return errorResponse({ message: "图片不能超过 5MB", status: 400 });
    }
  
    // 检查文件头（Magic Bytes），防止伪装
    const buffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
    const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50;
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45;
  
    if (!isJpeg && !isPng && !isWebp) {
      return errorResponse({ message: "非法文件", status: 400 });
    }
  
    // 用 Prisma 记录上传次数
    const recentUploads = await prisma.review.count({
      where: {
        userId: customerId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 最近1小时
        }
      }
    });
  
    if (recentUploads >= 5) {
      return errorResponse({ message: "上传太频繁，请稍后再试", status: 429 });
    }

    // imageFile 是一个File对象，可以拿到name,type,arrayBuffer等
    const fileName = imageFile.name || `comment-${Date.now()}.jpg`;
    const mimeType = imageFile.type || 'image/jpeg';
    // 把File 转成 Buffer（二进制）
    const arrayBuffer = await imageFile.arrayBuffer();
    const _buffer = Buffer.from(arrayBuffer);
    
    // 调用 stagedUploadsCreate 获取上传目标URL + 参数
    const stagedUploadVars = {
      input: [
        {
          resource: 'FILE', // 我们要上传文件
          filename: fileName,
          mimeType: mimeType,
          httpMethod: 'POST',
          // 这里得filesize 必须是字符串(字节数)
          fileSize: _buffer.byteLength.toString(),
        }
      ]
    };

    const stagedResp = await admin.graphql(STAGED_UPLOADS_CREATE_MUTATION, {
      variables: stagedUploadVars
    });
    const stagedJson = await stagedResp.json();
    const stagedResult = stagedJson.data?.stagedUploadsCreate;
    if (!stagedResult || stagedResult.userErrors?.length) {
      console.error('stagedUploadsCreate errors', stagedResult?.userErrors);
      return errorResponse({
        status:500,
        message: 'STAGED_UPLOAD_FAILED',
        data: stagedResult?.userErrors
      });
    }

    const target = stagedResult.stagedTargets[0];
    const { url, resourceUrl, parameters } = target;
    // 把文件POST到staged upload得URL
    const uploadForm = new FormData();
    // 这些parameters 是Shopify要求带上得字段(key,policy,signature)等
    parameters.forEach((param) => {
      uploadForm.append(param.name, param.value);
    });
    // 最后append文件本身，字段名通常为"file"
    uploadForm.append('file', new Blob([buffer], { type: mimeType }), fileName);

    const uploadResponse = await fetch(url, {
      method: 'POST',
      body: uploadForm
    });

    if (!uploadResponse.ok) {
      console.error('Upload to staged URL failed', await uploadResponse.text());
      return errorResponse({
        message:'UPLOAD_TO_STAGE_FAILED',
        status: 500
      })
    }

    // 用resourceUrl 调 fileCreate,正式在Shopify Files中建 File
    const fileCreateVars = {
      files: [
        {
          alt: 'Comment image',
          originalSource: resourceUrl, // 注意：这里是 staged target 的 resourceUrl
        }
      ]
    }

    const fileCreateResp = await admin.graphql(FILE_CREATE_MUTATION, {
      variables: fileCreateVars,
    })
    const fileCreateJson = await fileCreateResp.json();
    console.log(
      JSON.stringify(fileCreateJson, null, 2)
    );
    const fileCreateResult = fileCreateJson.data?.fileCreate;

    if (!fileCreateResult || fileCreateResult.userErrors?.length) {
      console.error('fileCreate errors', fileCreateResult?.userErrors);
      return errorResponse({
        message: 'FILE_CREATE_FAILED',
        data: fileCreateResult?.userErrors,
        status: 500
      })
    }

    const finalUrl = resourceUrl; // 这是shopify CDN 上得最终图片URL

    // 返回 URL 给前端，前端就可以在评论里用这个URL了。
    return successResponse({
      data: { url: finalUrl }
    })

  }catch(error) {
    console.log('error :>> ', error);
  }

}
