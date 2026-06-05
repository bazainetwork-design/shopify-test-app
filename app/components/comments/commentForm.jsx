import { useState, useEffect } from 'react';
import { useToast } from '../../utils/toast.js'
import { request } from '../../utils/request.js';
// 评论表单
export default function ReviewForm({onResult, isOk, headingTitle, comment}) {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [productId, setProductId] = useState();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('approved');
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [action, setAction] = useState('create');
  const toast = useToast();
  console.log('comment :>> ', comment);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!author || !productId || !title || !content) {
      setError('请填写所有必填字段');
      return;
    }

    setError('');
    const response = await request('/api/review', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        action,
        id: comment ? comment.id : '',
        author,
        productId,
        rating,
        title,
        content,
        status,
        imageUrl,
      })
    })
    const result = await response.json();
    console.log('result', result);
    if (result && result.success) {
      toast.success('评论提交成功');
      await onResult(result);
      if (isOk) {
        handleReset();
      }
    }
    // 这里执行你自己的提交逻辑：调用后端 / GraphQL / Admin API 等
    console.log('提交评论', {
      author,
      productId,
      rating,
      title,
      content,
      status,
      imageUrl,
    });
  };

  useEffect(() => {
    if(comment) {
      setAction('update');
      setAuthor(comment.author || '');
      setProductId(comment.productId || '');
      setRating(comment.rating || 5);
      setTitle(comment.title || '');
      setContent(comment.content || '');
      setStatus(comment.status || 'approved');
      setImageUrl(comment.imageUrl || '');
    }
  }, [comment])

  const handleImageChange = async (event) => {
    const nextFiles = Array.from(event.currentTarget?.files ?? []);
    if (!nextFiles) return;

    const file = nextFiles[0];
    const preview = document.getElementById('reivewImagePreview');
    const objectUrl = URL.createObjectURL(file);
    // 使用Polaris Thumbnail 组件显示预览
    preview.setAttribute('src', objectUrl);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await request('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        console.error('Upload failed', response.status);
        toast.error('上传失败');
        return;
      }
      const result = await response.json();
      console.log('result :>> ', result);
      if(result?.message == 'ok') {
        toast.success('图片上传成功');
        setImageUrl(result?.data?.url);
        console.log('imageUrl', imageUrl)
      } else {
        toast.error('图片地址返回异常');
      }
    } catch (error) {
      console.error(error);
      toast.error('上传异常，请稍后再试');
    }
    
  };

  const handleImageReject = () => {
    toast.error('仅支持图片文件，请检查文件类型或大小');
    setError('仅支持图片文件，请检查文件类型或大小');
  }
  useEffect(() => {
    console.log('imageUrl 更新:', imageUrl);
  }, [imageUrl]);

  const handleReset = () => {
    setProductId('')
    setAuthor('');
    setRating(5);
    setTitle('');
    setContent('');
    setStatus('approved');
    setImageUrl('');
    setError('');
  }

  return (
    <s-section padding="base" accessibilityLabel={headingTitle}>
      {/* 最外层<form> 承载 submit/reset */}
      <form onSubmit={handleSubmit} id="reviewForm">
        <s-stack gap="base">
          {/* 顶部错误提示 */}
          {error && (
            <s-banner tone="critical" title="提交失败">
              <s-text>{error}</s-text>
            </s-banner>
          )}

          {/* 作者 */}
          <s-text-field
            label="作者"
            name="author"
            value={author}
            onInput={(e) => setAuthor(e.currentTarget.value)}
            placeholder="请输入评论作者"
            required
          />

          {/* 商品名 */}
          <s-text-field 
            label="商品ID"
            name="productId"
            value={productId}
            onInput={(e) => setProductId(e.currentTarget.value)}
            placeholder="请输入商品Id"
            required
          />

          {/* 评分 */}
          <s-select 
            label="评分"
            name="rating"
            value={rating}
            onChange={(e) => setRating(e.currentTarget.value)}
            required
          >
            <s-option value="1">1 星</s-option>
            <s-option value="2">2 星</s-option>
            <s-option value="3">3 星</s-option>
            <s-option value="4">4 星</s-option>
            <s-option value="5">5 星</s-option>
          </s-select>
          
          {/* 评论标题 */}
          <s-text-field 
            label="标题"
            name="title"
            value={title}
            onInput={(e) => setTitle(e.currentTarget.value)}
            placeholder="请输入标题"
            required
          />

          {/* 评论内容: 多行 */}
          <s-text-area
            label="评论内容"
            name="content"
            value={content}
            onInput={(e) => setContent(e.currentTarget.value)}
            placeholder="请输入评论内容"
            rows={4}
            required
          />

          {/* 评论状态: 下拉选择 */}
          <s-select
            label="状态"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value)}
            required
          >
            <s-option value="approved">已通过</s-option>
            <s-option value="pending">待审核</s-option>
            <s-option value="rejected">已拒绝</s-option>
          </s-select>


          {/* 图片上传: Drop zone */}
          <s-drop-zone
            label="上传图片"
            id="reivewImage"
            name="images"
            accept="image/*"
            multiple="false"
            accessibilityLabel="上传评论图片"
            onChange={handleImageChange}
            onDropRejected={handleImageReject}
          />
          {/* 用来存储后端返回的图片 URL */}
          <input type="hidden" name="uploadedImageUrl" id="uploadedImageUrl" />
          {/* 预览区域 */}
          <s-stack direction="block" gap="small-200">
            <s-text type="strong">预览</s-text>
            <s-thumbnail id="reivewImagePreview" alt="预览图片" size="large"></s-thumbnail>
          </s-stack>


          
          {/* 底部按钮 */}
          <s-inline-layout align="end" style={{ display: "flex", justifyContent:'flex-end', gap: "16px" }}>
            <s-button
              variant="secondary"
              type="reset"
              onClick={handleReset}
            >
              重置
            </s-button>
            <s-button variant="primary" type="submit">
              保存评论
            </s-button>
          </s-inline-layout>
        </s-stack>
      </form>
    </s-section>
  )
}

