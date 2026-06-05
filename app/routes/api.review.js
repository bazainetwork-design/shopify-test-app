import sanitizeHtml from "sanitize-html";
import prisma from '../db.server.js'
import { successResponse, errorResponse } from '../utils/response.server.js'
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Number(url.searchParams.get('pageSize')) || 10;
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';
  const shop = session.shop;
  if (id) {
    return getReview(id);
  }

  return getReviews({
    page,
    pageSize,
    filter,
    search,
    shop
  });
}

export async function action({request}) {
  const data = await request.json();
  const { session } = await authenticate.admin(request);

  switch (data.action) {
    case 'create':
      if (request.method !== 'POST') {
        return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
      }
      
      return CreateReview(data, session.shop);
    case 'update':
      if (request.method !== 'POST') {
        return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
      }
      return UpdateReview(data, session.shop);
    case 'delete':
      if (request.method !== 'POST') {
        return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
      }
      return DeleteReview(data.id);
  }
}

// 基础校验
const checkBaseInfo = (data) => {
  if (!data.author || 
    !data.rating || 
    !data.productId ||
    !data.status ||
    !data.title ||
    !data.content
  ) {
    return errorResponse({ message: '信息不齐', status: 400 })
  }
  const cleanContent = sanitizeHtml(data.content, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanTitle = sanitizeHtml(data.title, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanProductId = sanitizeHtml(data.productId, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanAuthor = sanitizeHtml(data.author, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanImageUrl = sanitizeHtml(data.imageUrl, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const cleanStatus = sanitizeHtml(data.status, {
    allowedTags: [],
    allowedAttributes: {},
  })
  return {
    cleanContent,
    cleanTitle,
    cleanProductId,
    cleanAuthor,
    cleanImageUrl,
    cleanStatus
  }
}

// 创建评论
const CreateReview = async (data, shop) => {
  try {
    const {
      cleanContent, 
      cleanTitle, 
      cleanProductId,
      cleanAuthor,
      cleanImageUrl,
      cleanStatus
    } = checkBaseInfo(data);
    // 入库
    const review = await prisma.review.create({
      data: {
        shop,
        author: cleanAuthor,
        productId: cleanProductId,
        rating: Number(data.rating),
        title: cleanTitle,
        content: cleanContent,
        status: cleanStatus || 'pending',
        imageUrl: cleanImageUrl || null
      }
    });
    
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
  } catch(error) {
    console.log('error', error)
  }
}

// 更新评论
const UpdateReview = async (data) => {
  console.log('data :>> ', data);
  try {
    const {
      cleanContent, 
      cleanTitle, 
      cleanProductId,
      cleanAuthor,
      cleanImageUrl,
      cleanStatus
    } = checkBaseInfo(data);
    const id = Number(data.id);
    const existing = await prisma.review.findUnique({
      where: { id },
    });
    if (!existing) {
      return errorResponse({ message: 'Review not found', status: 201 });
    }
    // 修改库
    const review = await prisma.review.update({
      where: {
        id
      },
      data: {
        author: cleanAuthor,
        productId: cleanProductId,
        rating: Number(data.rating),
        title: cleanTitle,
        content: cleanContent,
        status: cleanStatus ?? 'pending',
        imageUrl: cleanImageUrl || null
      }
    });

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
    console.log('error', error);
    return errorResponse({
      message: error.message || 'Update review failed',
      status: 500
    });
  }
}

// 逻辑删除评论
const DeleteReview = async (id) => {
  try {
    const isExist = await prisma.review.findUnique({ where: { id: Number(id) } });
    if (!isExist) {
      return errorResponse({ message: '评论不存在', status: 404 })
    }
    const review = await prisma.review.update({
      where: {
        id: Number(id)
      },
      data: {
        isDeleted: true
      }
    })
    return successResponse({
      data: {
        id: review.id
      }
    })
  } catch(error) {
    // 找不到 id，会抛 P2025
    if (error.code === 'P2025') {
      return errorResponse({ message: '评论不存在', status: 404 });
    }

    // 其他错误
    return errorResponse({ message: error.message });
  }
}
// 获取评论
const getReviews = async ({ page, pageSize, filter, search, shop}) => {
  const cleanSearch = sanitizeHtml(search, {
    allowedTags: [],
    allowedAttributes: {},
  })
  const where = {
    shop,
    isDeleted: false
  }
  if (filter !== 'all') {
    where.status = filter;
  }
  if (search) {
    where.OR = [
      {
        author: {
          contains: cleanSearch,
        }
      },
      {
        title: {
          contains: cleanSearch
        }
      },
      {
        content: {
          contains: cleanSearch
        }
      }
    ]
  }
  const [list, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.review.count({
      where
    })
  ]);

  return successResponse({
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  })
}

// 获取单条评论
const getReview = async (id) => {
  console.log('id :>> ', id);
}