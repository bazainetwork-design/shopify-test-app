document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('review-widget');
  const commentList = document.getElementById('commentList');
  const commentBox_footer_left_edit = document.querySelector('.commentBox_footer_left_edit');
  const reviewsDialogClose = document.querySelector('.reviews-dialog-close');
  const reviewsDialog = document.getElementById('reviews-dialog');
  const productId = container.dataset.productId;
  const t = window.reviewTranslations;
  const locale = window.themeConfig.__shop.locale;
  const reviewRatingsStarWrapper = document.querySelector('.review_ratings_star_wrapper');
  const review_error_tip = document.querySelectorAll('.review_error_tip');
  const stars = document.querySelectorAll('.star-svg');
  const form = document.getElementById('reviewForm');
  const uploadImage = document.getElementById('uploadImage');
  let imageUrl = null;
  let selectedRating = 0;
  let list = []; // 评论数据
  const visitorId = getVisitorId(); // 游客(本地)标识
  if (!container) return;
  let page = 1;
  let pageSize = 5;
  let total = 0;
  function showLoading() {
    document.getElementById('global-loading').style.display = 'flex';
  }
  function hideLoading() {
    document.getElementById('global-loading').style.display = 'none';
  }
  async function getReviews() {
    try {
      console.log('object :>> 请求');
      const response = await fetch(`/apps/reviews?id=${productId}&page=${page}&pageSize=${pageSize}&visitorId=${visitorId}&locale=${locale}`);
      const reviews = await response.json();
      console.log('reviews :>> ', reviews);
      if (reviews?.success) {
        list = reviews?.data?.list;
        page = reviews?.data?.page;
        pageSize = reviews?.data?.pageSize;
        total = reviews?.data?.total;
        const ratingMap = reviews?.data?.ratingMap;
        const avgRating = reviews?.data?.avgRating;
        renderReviews(list);
        renderPagenation();
        renderRatingSummary(ratingMap, total, avgRating);
      }
    } catch(error) {
      console.log('error :>> ', error);
    }
  }
  function escapeHtml(str = '') {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function renderReviews(list) {
    if (list?.length == 0) {
      commentList.innerHTML = `<p class="no_review">${t.noReview}</p>`;
      return;
    }
    commentList.innerHTML = '';
    list.forEach(review => {
      const reviewElement = document.createElement('li');
      reviewElement.className = 'commentList_li';
      const rating = Math.floor(review.rating) || 0;
      const isDot = review.rating?.toString().includes('.');

      let startHtml = '';
      for(let i = 0; i < 5; i++) {
        if (i < rating) {
          startHtml += `<li class="review_ratings_star_li"><svg width="20" height="20" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="#1999bf" /></svg></li>`
          continue
        }
        if (isDot) {
          startHtml += `<li class="review_ratings_star_li"><svg width="20" height="20" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="#1999bf" /><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 Z" fill="white" stroke="#1999bf" stroke-width="16" /></svg></li>`
          continue
        }
        startHtml += `<li class="review_ratings_star_li"><svg width="20" height="20" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="white" stroke="#1999bf" stroke-width="16" /></svg></li>`
      }

      const _author = escapeHtml(review.author);
      const _title = escapeHtml(review.title);
      const _content = escapeHtml(review.content);

      reviewElement.innerHTML = `
        <div class="li_left">
          <div class="li_left_name">
            <svg t="1780643275158" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1167" width="35" height="35"><path d="M512 0a512 512 0 1 0 512 512A512 512 0 0 0 512 0zM213.333 832A298.667 298.667 0 0 1 512 533.333a170.667 170.667 0 1 1 170.667-170.666A170.667 170.667 0 0 1 512 533.333 298.667 298.667 0 0 1 810.667 832z" fill="#1898bf" p-id="1168"></path></svg>
            <span class="username">${_author}</span>
          </div>
          <div class="li_left_dateTime">${t.reviewedOn} ${new Date(review.createdAt).toLocaleString()}</div>
          <div class="li_right_rate">
            <div class="rate_top">
              <div class="rate">
                <ul class="review_ratings_star_ul">
                  ${startHtml}
                </ul>
              </div>
              <div class="rate_title">${_title}</div>
            </div>
            <div class="rate_center">${_content}</div>
            <div class="rate_review_like">
              <p class="rate_review_like_c" data-id="${review.id}">
                <svg t="1780999095781" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1321" width="16" height="16"><path d="M64 483.04V872c0 37.216 30.144 67.36 67.36 67.36H192V416.32l-60.64-0.64A67.36 67.36 0 0 0 64 483.04zM857.28 344.992l-267.808 1.696c12.576-44.256 18.944-83.584 18.944-118.208 0-78.56-68.832-155.488-137.568-145.504-60.608 8.8-67.264 61.184-67.264 126.816v59.264c0 76.064-63.84 140.864-137.856 148L256 416.96v522.4h527.552a102.72 102.72 0 0 0 100.928-83.584l73.728-388.96a102.72 102.72 0 0 0-100.928-121.824z" p-id="1322" fill="${review.isLike ? '#1999bf': '#cdcdcd'}"></path></svg>
                <span class="rate_review_like_num">${review.likeCount}</span>
                <span class="rate_review_like_tip">${t.helpeful}</span>   
              </p>
            </div>
          </div>
        </div>
      `;
      commentList.appendChild(reviewElement);
    })
  }
  function renderPagenation() {
    const pageCount = Math.ceil(total / pageSize); // 总页数
    const pagination = document.getElementById('reviews_pagination');
    if (pageCount <= 1) {
      pagination.style.display = 'none';
      return;
    }
    let pageHtml = '';
    for (let i = 0; i < pageCount; i++) {
      pageHtml += `<li class="pagination_li_num ${i + 1 == page ? 'pagination_li_num_active' : ''}">${i + 1}</li>`
    }
    pagination.innerHTML = pageHtml;

    const nextBtn = document.querySelector('.pagination_next');
    const prevBtn = document.querySelector('.pagination_prev');
    const pageBtns = pagination.querySelectorAll('.pagination_li_num');
    pageBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const selectedPage = Number(this.innerText);
        if (selectedPage !== page) {
          page = selectedPage;
          getReviews();
        }
      })
    })
    nextBtn.addEventListener('click', function(e) {
      if (page < pageCount) {
        page++;
        getReviews();
      }
    })
    prevBtn.addEventListener('click', function(e) {
      if (page > 1) {
        page--;
        getReviews();
      }
    })
  }
  function renderRatingSummary(option, total, avgRating) {
    let summaryHtml = '';
    const Reviews_top_wrapper = document.getElementById('Reviews_top_wrapper');
    const review_ratings_ratingTotal = document.getElementById('review_ratings_ratingTotal');
    const rating_review_total = document.getElementById('rating_review_total');
    const review_ratings_star_ul = document.getElementById('review_ratings_star_ul');

    Object.entries(option).sort((a, b) => Number(b[0]) - Number(a[0])).map(([rating, count]) => {
      summaryHtml += `
        <li class="flex Reviews_top_progress mb10">
          <p class="flex Reviews_top_txt">
            <span class="Reviews_top_start_num">${rating}</span>
            <span class="">${t.stars}</span>
          </p>
          <div class="Reviews_progress_rate pointer" data-type="${rating}">
            <div class="progress-bar" style="width: ${Math.ceil(count / total)}%;"></div>
          </div>
          <p class=""><span class="start_${rating}">${count}</span></p>
        </li>
      `
    })

    let startHtml = '';
    const _avgRating = Math.floor(avgRating);
    const isDot = avgRating.toString().includes('.');
    for(let i = 0; i < 5; i++) {
      if (i < _avgRating) {
        startHtml += `<li class="review_ratings_star_li"><svg width="25" height="25" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="#1999bf" /></svg></li>`
        continue
      }
      if (isDot) {
        startHtml += `<li class="review_ratings_star_li"><svg width="25" height="25" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="#1999bf" /><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 Z" fill="white" stroke="#1999bf" stroke-width="16" /></svg></li>`
        continue
      }
      startHtml += `<li class="review_ratings_star_li"><svg width="25" height="25" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M500 10 L605 320 L930 320 L665 510 L770 830 L500 630 L230 830 L335 510 L70 320 L395 320 Z" fill="white" stroke="#1999bf" stroke-width="16" /></svg></li>`
    }

    review_ratings_star_ul.innerHTML = startHtml;
    Reviews_top_wrapper.innerHTML = summaryHtml;
    review_ratings_ratingTotal.innerHTML = avgRating;
    rating_review_total.innerHTML = total;
  }

  async function setReviewLike(reviewId) {
    showLoading();
    try {
      let formData = new FormData();
      formData.append('action', 'like');
      formData.append('reviewId', reviewId);
      formData.append('visitorId', visitorId);
      const response = await fetch('/apps/reviews', {
        method: 'POST',
        body: formData
      })
      const result = await response.json();
      if (result.message == 'ok') {
        const likeBtn = document.querySelector(`.rate_review_like_c[data-id="${reviewId}"]`);
        const likeNumEl = likeBtn.querySelector('.rate_review_like_num');
        if (!likeNumEl) return;
        likeNumEl.textContent = Number(likeNumEl.textContent || 0) + 1;
      }
      showToast(result.message)
    } finally {
      hideLoading();
      
    }
  }

  commentBox_footer_left_edit.addEventListener('click', function() {
    reviewsDialog.classList.add('flex');
  })

  reviewsDialogClose.addEventListener('click', function() {
    reviewsDialog.classList.add('closing');

    // 等动画结束再真正关闭
    reviewsDialog.addEventListener('animationend', function(e) {
      reviewsDialog.classList.remove('flex');
      reviewsDialog.classList.remove('closing');
    }, { once: true }); // once: true 确保只执行一次
  })

  stars.forEach((star, index) => {
    star.addEventListener('mouseenter', () => {
      stars.forEach((item, i) => {
        item.classList.toggle('active', i <= index);
      })
    })
  })

  stars.forEach((star, index) => {
    star.addEventListener('click', function () {
      selectedRating = index + 1;
    })
  })

  reviewRatingsStarWrapper.addEventListener('mouseleave', function() {
    stars.forEach((item, i) => {
      item.classList.toggle(
        'active',
        i < selectedRating
      );
    });
  })
  
  form.addEventListener('submit', async function (e) {
    // 阻止表单默认提交
    e.preventDefault();

    const formData = new FormData(form);

    const data = {
      rate: Number(selectedRating),
      title: formData.get('title')?.trim(),
      author: formData.get('author')?.trim(),
      content: formData.get('content')?.trim()
    };

    let isOk = true;

    if (!data.rate) {
      review_error_tip[0].classList.add('block');
      isOk = false;
    } else {
      review_error_tip[0].classList.remove('block');
    }
    
    if (!data.title) {
      review_error_tip[1].classList.add('block');
      isOk = false;
    } else {
      review_error_tip[1].classList.remove('block');
    }
    
    if (!data.author) {
      review_error_tip[2].classList.add('block');
      isOk = false;
    } else {
      review_error_tip[2].classList.remove('block');
    }
    
    if (!data.content) {
      review_error_tip[3].classList.add('block');
      isOk = false;
    } else {
      review_error_tip[3].classList.remove('block');
    }
    
    if (!isOk) return;

    formData.append('action', 'create')
    formData.append('rate', Number(selectedRating))
    formData.append('productId', productId)
    formData.append('imageUrl', imageUrl)
    formData.append('locale', locale)
    showLoading()
    try {
      const response = await fetch('/apps/reviews', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        showToast(t.review_submit)
        list.unshift(result.data);
        list.pop();
        renderReviews(list);
      }
    } finally {
      hideLoading()
    }
  })

  if (uploadImage) {
    uploadImage.addEventListener('change', async function(e) {
      const nextFiles = Array.from(event.currentTarget?.files ?? []);
      if (!nextFiles) return;
      const file = nextFiles[0];
      const formData = new FormData();
      formData.append('action', 'upload');
      formData.append('image', file);
      showLoading();
      try {
        const response = await fetch('/apps/reviews', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          console.error('Upload failed', response.status);
          return;
        }
        const result = await response.json();
        console.log('result :>> ', result);
        if (result.message == 'ok') {
          showToast(t.image_uploaded)
          imageUrl = result?.data?.url;
        }
      } catch (error) {
        console.error(error);
      } finally {
        hideLoading();
      }
    })
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#333' : '#e53e3e'};
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 99999;
      font-size: 14px;
      animation: toastFadeIn 0.3s ease forwards;
    `;
    document.body.appendChild(toast);

    // 2s后触发淡出动画
    setTimeout(() => {
      toast.style.animation = 'toastFadeOut 0.3s ease forwards';
      // 等淡出动画结束后移除元素
      toast.addEventListener('animationend', () => toast.remove());
    }, 2000);
  }

  commentList.addEventListener('click', async function (event) {
    const likeBtn = event.target.closest('.rate_review_like_c');

    if (!likeBtn) {
      return;
    }

    const reviewId = likeBtn.dataset.id;

    await setReviewLike(reviewId);
  })
  // 生成游客标识
  function getVisitorId() {
    let visitorId = localStorage.getItem('review_visitor_id');
  
    if (!visitorId) {
      visitorId =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2);
  
      localStorage.setItem('review_visitor_id', visitorId);
    }
  
    return visitorId;
  }

  getReviews();
})
