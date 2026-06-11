import sanitizeHtml from "sanitize-html";
import { Buffer } from 'node:buffer';
import prisma from '../db.server.js'
import { successResponse, errorResponse } from '../utils/response.server.js'
import { authenticate } from "../shopify.server.js";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    console.log('Loader triggered: ', request.url);
    console.log("HOST:", request.headers.get("host"));
    console.log("REFERER:", request.headers.get("referer"));
    // const { session } = await authenticate.public.appProxy(request);
    const productId = url.searchParams.get("id");
    const locale = url.searchParams.get("locale");
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 10;
    const visitorId = url.searchParams.get("visitorId") || '';
    const customerId = visitorId;
    if (!productId) {
      return errorResponse({
        message: 'Product ID is required',
        status: 400
      });
    }
    const where = {
      locale,
      productId,
      isDeleted: false,
      status: "approved" // 只返回公开评论
    };
    
    const [list, ratingStats, aggregate] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" }
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: {
          rating: true
        }
      }),
      prisma.review.aggregate({
        where,
        _avg: {
          rating: true
        },
        _count: true
      })
    ]);

    const total = aggregate._count;
    const avgRating = aggregate._avg.rating || 0;

    const ratingMap = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    }
    ratingStats.forEach(item => {
      ratingMap[item.rating] = item._count.rating;
    })
  
    const reviewIds = list.map(item => item.id);
    const likes = await prisma.reviewLike.findMany({
      where: {
        customerId,
        reviewId: {
          in: reviewIds
        }
      },
      select: {
        reviewId: true
      }
    });
    const newList = list.map(item => {
      item.isLike = likes.some(
        like => like.reviewId == item.id
      )
      return item;
    })

    return successResponse({
      data: {
        list: newList,
        total,
        page,
        pageSize,
        ratingMap,
        avgRating
      }
    });
  } catch(error) {
    console.log('error', error);
    return errorResponse({
      message: error.message || 'Get review failed',
      status: 500
    });
  }
}

export async function action({request}) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }
  let formData = null;
  let action = null;
  formData = await request.formData();
  action = formData.get('action');
  const { session, admin } = await authenticate.public.appProxy(request);
  switch (action) {
    case 'create':
      return CreateReview(formData, session);
    case 'upload':
      return UploadImage(formData, session, admin);
    case 'like':
      return SetReviewLike(formData, session, admin);
  }
}

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

// 基础校验
const checkBaseInfo = (formData) => {
  const author = formData.get('author');
  const rate = formData.get('rate');
  const productId = formData.get('productId');
  const title = formData.get('title');
  const content = formData.get('content');
  const imageUrl = formData.get('imageUrl');
  const shop = formData.get('shop');
  if (!author || 
    !rate || 
    !productId ||
    !title ||
    !content
  ) {
    return errorResponse({ message: '信息不齐', status: 400 })
  }
  const cleanContent = sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanTitle = sanitizeHtml(title, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanShop = sanitizeHtml(shop, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanRating = sanitizeHtml(rate, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanProductId = sanitizeHtml(productId, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanAuthor = sanitizeHtml(author, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanImageUrl = sanitizeHtml(imageUrl, {
    allowedTags: [],
    allowedAttributes: {},
  })
  return {
    cleanContent,
    cleanTitle,
    cleanProductId,
    cleanAuthor,
    cleanRating,
    cleanShop,
    cleanImageUrl
  }
}

// 用户创建评论
const CreateReview = async (formData, session) => {
  try {
    const {
      cleanContent, 
      cleanTitle, 
      cleanProductId,
      cleanAuthor,
      cleanRating,
      cleanImageUrl
    } = checkBaseInfo(formData);
    const customerId = session?.loggedInCustomerId;
    // 入库
    const review = await prisma.review.create({
      data: {
        shop: session.shop ?? null,
        userId: customerId ? String(customerId) : null,
        author: cleanAuthor,
        productId: cleanProductId,
        rating: Number(cleanRating),
        title: cleanTitle,
        content: cleanContent,
        status: 'pending',
        imageUrl: cleanImageUrl || null
      }
    })

    return successResponse({
      data: {
        id: review.id,
        author: review.author,
        productId: review.productId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        status: review.status,
        imageUrl: review.imageUrl,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      } 
    })
  } catch (error) {
    console.log('error :>> ', error);
    return errorResponse({ message: 'error', data: error, status: 500 })
  }
}

// 图片校验
const checkBaseImg = async (imageFile, customerId, arrayBuffer) => {
  if (!imageFile) {
    return errorResponse({ message: 'NO_FILE', status: 400 });
  }

  // 未登录不允许上传
  if (!customerId) {
    return errorResponse({ message: "请先登录", status: 401 });
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
  const bytes = new Uint8Array(arrayBuffer);
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
  const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isWebp = bytes.length > 10 && bytes[8] === 0x57 && bytes[9] === 0x45;
  const isGif = bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return errorResponse({ message: "非法文件", status: 400 });
  }

  // 用 Prisma 记录次数
  const recentUploads = await prisma.uploadLog.count({
    where: {
      userId: customerId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000 * 24)
      }
    }
  });

  if (recentUploads >= 5) {
    return errorResponse({ message: "上传太频繁，请稍后再试", status: 429 });
  }
  return null
}

// 图片上传
const UploadImage = async (formData, session, admin) => {
  try {
    const imageFile = formData.get("image");
    // 把File 转成 Buffer（二进制）
    const arrayBuffer = await imageFile.arrayBuffer();
    const customerId = session?.loggedInCustomerId;
    const validateResult = await checkBaseImg(imageFile, customerId, arrayBuffer)
    if (validateResult) {
      return validateResult;
    }
    // imageFile 是一个File对象，可以拿到name,type,arrayBuffer等
    const fileName = imageFile.name || `comment-${Date.now()}.jpg`;
    const mimeType = imageFile.type || 'image/jpeg';
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
    uploadForm.append('file', new Blob([_buffer], { type: mimeType }), fileName);

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
    console.log(JSON.stringify(fileCreateJson, null, 2));
    const fileCreateResult = fileCreateJson.data?.fileCreate;
    console.log('fileCreateResult.files[0] :>> ', fileCreateResult.files[0]);
    if (!fileCreateResult || fileCreateResult.userErrors?.length) {
      console.error('fileCreate errors', fileCreateResult?.userErrors);
      return errorResponse({
        message: 'FILE_CREATE_FAILED',
        data: fileCreateResult?.userErrors,
        status: 500
      })
    }

    // 用 Prisma 记录次数
    await prisma.uploadLog.create({
      data: {
        userId: String(customerId),
      }
    });

    const finalUrl = resourceUrl; // 这是shopify CDN 上得最终图片URL

    // 返回 URL 给前端，前端就可以在评论里用这个URL了。
    return successResponse({
      data: { url: finalUrl }
    })

  }catch(error) {
    console.log('error :>> ', error);
    return errorResponse({ message: 'error', data: error, status: 500 })
  }
}

// 记录点赞
const SetReviewLike = async (formData, session) => {
  try {
    const reviewId = Number(formData.get('reviewId'));
    const visitorId = formData.get('visitorId');
    const customerId = session?.loggedInCustomerId ?? visitorId;
    const liked = await prisma.reviewLike.findUnique({
      where: {
        reviewId_customerId: {
          reviewId,
          customerId
        }
      }
    });

    if (liked) {
      return successResponse({ message: "You've already liked this." })
    } else {
      const res = await prisma.$transaction([
        prisma.reviewLike.create({
          data: {
            reviewId,
            customerId
          }
        }),
        prisma.review.update({
          where: {
            id: reviewId
          },
          data: {
            likeCount: {
              increment: 1
            }
          }
        })
      ])
      if (res.length > 0) return successResponse({ status: 200 })
      return errorResponse({ data : res })
    }
  } catch (error) {
    console.log('error :>> ', error);
    return errorResponse({ message: 'error', data: error, status: 500 })
  }
}