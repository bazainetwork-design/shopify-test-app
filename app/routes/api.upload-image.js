// 上传产品
import { Buffer } from 'node:buffer';
import shopify from '../shopify.server.js';
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
  console.log('>>> hit /api/upload-image, method =', request.method);
  try {
    if (request.method !== 'POST') {
      return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const formData = await request.formData();
    console.log([...formData.keys()]);
    // 2.从formData 中取出file
    // 从前端FormData.append('image', file)
    const file = formData.get('image');

    console.log('file:', file);

    if (!file) {
      return Response.json({ error: 'NO_FILE' }, { status: 400 });
    }

    // file 是一个File对象，可以拿到name,type,arrayBuffer等
    const fileName = file.name || `comment-${Date.now()}.jpg`;
    const mimeType = file.type || 'image/jpeg';
    // 把File 转成 Buffer（二进制）
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. 通过shopify.authenticate.admin 拿到Admin GraphQL client
    const { admin } = await shopify.authenticate.admin(request);

    // 5. 调用 stagedUploadsCreate 获取上传目标URL + 参数
    const stagedUploadVars = {
      input: [
        {
          resource: 'FILE', // 我们要上传文件
          filename: fileName,
          mimeType: mimeType,
          httpMethod: 'POST',
          // 这里得filesize 必须是字符串(字节数)
          fileSize: buffer.byteLength.toString(),
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
  } catch (error) {
    console.error('UPLOAD ERROR', error);
    return errorResponse({
      message: error?.message || 'UPLOAD_FAILED',
      data: { stack: error?.stack }
    })
  }
}