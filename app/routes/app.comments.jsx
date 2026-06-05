import { useMemo, useState, useEffect, useRef } from 'react';
import { useFetcher } from "react-router";
import styles from "../styles/comments.module.css";
import ReviewForm from '../components/comments/commentForm'
import { request } from '../utils/request.js';

// 静态 mock 数据，后续由 loader 从数据库 / Metaobject 读取
const INITIAL_COMMENTS = [
  {
    id: "1",
    author: "张三",
    email: "zhangsan@example.com",
    product: "Red Snowboard",
    productId: "gid://shopify/Product/1001",
    rating: 5,
    content: "质量很好，物流也快！",
    status: "approved",
    createdAt: "2026-06-01 14:30",
  },
  {
    id: "2",
    author: "李四",
    email: "lisi@example.com",
    product: "Green Snowboard",
    productId: "gid://shopify/Product/1002",
    rating: 4,
    content: "整体不错，颜色比图片略深一点。",
    status: "pending",
    createdAt: "2026-06-02 09:15",
  },
  {
    id: "3",
    author: "王五",
    email: "wangwu@example.com",
    product: "Yellow Snowboard",
    productId: "gid://shopify/Product/1003",
    rating: 3,
    content: "一般般，包装可以再改进。",
    status: "pending",
    createdAt: "2026-06-02 11:42",
  },
  {
    id: "4",
    author: "匿名用户",
    email: "spam@example.com",
    product: "Orange Snowboard",
    productId: "gid://shopify/Product/1004",
    rating: 1,
    content: "疑似广告内容，请审核。",
    status: "rejected",
    createdAt: "2026-06-01 20:08",
  },
];

const STATUS = {
  approved: { label: "已通过", tone: "success" },
  pending: { label: "待审核", tone: "warning" },
  rejected: { label: "已拒绝", tone: "critical" },
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待审核" },
  { id: "approved", label: "已通过" },
  { id: "rejected", label: "已拒绝" },
];

function renderStars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected = selectedIds.length === INITIAL_COMMENTS.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < INITIAL_COMMENTS.length;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [accessibilityLabel, setAccessibilityLabel] = useState('新建商品评论表单');
  const [headingTitle, setHeadingTitle] = useState('新建评论');
  const [comment, setComment] = useState(null);
  const fetcher = useFetcher();
  const modalRef = useRef(null);
  const [isOk, setIsOk] = useState(false);
  const [delId, setDelId] = useState(null);
  let options = {
    page: currentPage,
    pageSize: 10,
    filter,
    search
  }

  const getComments = async (params) => {
    const { page = 1, pageSize = 10, filter = 'all', search = '' } = params;
    // 这里可以调用 API 获取评论列表,并更新状态
    fetcher.load(`/api/review?page=${page}&pageSize=${pageSize}&filter=${filter}&search=${search}`);
  }

  const deleteComment = async (id) => {
    // 这里可以调用 API 获取评论列表,并更新状态
    const result = await request(`/api/review`, { 
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ id, action: 'delete' })
    });
    const data = await result.json();
    if (data && data.success) {
      setComments(prev => prev.filter(comment => comment.id !== id));
      const confirmModal = document.getElementById('confirm-modal');
      confirmModal.hideOverlay();
    }
  }

  useEffect(() => {
    getComments(options);
  }, [])

  useEffect(() => {
    if (!fetcher.data) return;
    console.log('fetcher.data :>> ', fetcher.data);
    const _data = fetcher.data;
    if (_data && _data.success) {
      setComments(_data.data.list);
      setTotalPages(_data.data.totalPages);
      setTotal(_data.data.total);
    }
  }, [fetcher.data])

  // 上一页
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  // 下一页
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // 把计算结果缓存起来,避免重复计算
  const stats = useMemo(
    () => ({
      total: comments.length, // 总数
      pending: comments.filter((c) => c.status === "pending").length, // 待审核数量
      approved: comments.filter((c) => c.status === "approved").length, // 已通过数量
      rejected: comments.filter((c) => c.status === "rejected").length, // 已拒绝数量
    }),
    [comments] // 依赖项,当 comments 变化时,重新计算
  );

  // 删除评论
  const removeComment = (id) => {
    const confirmModal = document.getElementById('confirm-modal');
    setDelId(id);
    confirmModal.showOverlay();
  }
  const handleConfirmDelete = async () => {
    deleteComment(delId);
  }
  // 头部「全选」checkbox 的逻辑
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(INITIAL_COMMENTS.map(p => p.id));
    }
  }

  // 单行勾选/取消
  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // 子组件返回的数据
  const handleResult = result => {
    const reviewModal = document.getElementById('review-modal');
    console.log('子组件返回的数据', result)
    if (headingTitle == '新建评论')  {
      setComments(prev => [result.data, ...prev]);
      setIsOk(true);
    } else {
      setComments(prev => prev.map(comment => comment.id === result.data.id ? result.data : comment));
    }
    reviewModal.hideOverlay();
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await getComments({...options, page: currentPage, filter, search: search.trim().toLowerCase() })
      if (result && result.success) {
        setComments(result.data.list);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      }
    }, 300)

    return () => clearTimeout(timer);
  }, [filter, search, currentPage])

  const handleOpen = (type, comment) => {
    const reviewModal = document.getElementById('review-modal');
    if (type == 1) {
      setAccessibilityLabel('新建商品评论表单');
      setHeadingTitle('新建评论')
      setComment(null);
    } else {
      setAccessibilityLabel('编辑商品评论表单');
      setHeadingTitle('编辑评论')
      console.log('comments :>> ', comment);
      setComment(comment);
    }
    reviewModal.showOverlay();
  }

  return (
    <s-page heading="评论管理">
      <s-button slot="primary-action" disabled>
        导出(待接入)
      </s-button>

      {/* 数据概览 */}
      <s-section heading="数据概览">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>全部评论</s-text>
              <s-text type="strong">{total}</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>待审核</s-text>
              <s-text type="strong">{stats.pending}</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>已通过</s-text>
              <s-text type="strong">{stats.approved}</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>已拒绝</s-text>
              <s-text type="strong">{stats.rejected}</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
      
      {/* 筛选与搜索 + 表格 */}
      <s-section accessibilityLabel="评论列表" padding="none">
        <s-box padding="base">
          <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
            <s-stack direction="inline" gap="small">
              {FILTERS.map((item) => (
                <s-button
                  key={item.id}
                  variant={filter === item.id ? "primary" : "secondary"}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </s-button>
              ))}
            </s-stack>
            <s-stack direction="inline" gap="base" class={styles.create_comment}>
              <s-button onClick={() => handleOpen(1)}>新建评论</s-button>
            </s-stack>
          </s-stack>
        </s-box>

        {comments.length === 0 ? (
          <s-box padding="base" background="subdued">
            <s-paragraph>暂无符合条件的评论。</s-paragraph>
          </s-box>
        ) : (
          <>
            <s-table variant="table">
              <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                <s-text-field
                  label="搜索"
                  value={search}
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="按作者、商品或评论内容搜索"
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <s-button
                  icon="sort"
                  variant="secondary"
                  accessibilityLabel="Sort"
                  interestFor="sort-tooltip"
                  commandFor="sort-actions"
                />
                <s-tooltip id="sort-tooltip">
                  <s-text>Sort</s-text>
                </s-tooltip>
                <s-popover id="sort-actions">
                  <s-stack gap="none">
                    <s-box padding="small">
                      <s-choice-list label="Sort by" name="Sort by">
                        <s-choice value="puzzle-name" selected>
                          Puzzle name
                        </s-choice>
                        <s-choice value="pieces">Pieces</s-choice>
                        <s-choice value="created">Created</s-choice>
                        <s-choice value="status">Status</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                    <s-box padding="small">
                      <s-choice-list label="Order by" name="Order by">
                        <s-choice value="product-title" selected>
                          A-Z
                        </s-choice>
                        <s-choice value="created">Z-A</s-choice>
                      </s-choice-list>
                    </s-box>
                  </s-stack>
                </s-popover>
              </s-grid>
              <s-table-header-row>
                <s-table-header ><s-checkbox id="all-choose" checked={allSelected} indeterminate={someSelected} alignItems='center' onChange={handleSelectAll} /></s-table-header>
                <s-table-header format="numeric"><s-stack alignItems='center'>序列</s-stack></s-table-header>
                <s-table-header><s-stack alignItems='center'>商品id</s-stack></s-table-header>
                <s-table-header listSlot="primary"><s-stack alignItems='center'>用户昵称</s-stack></s-table-header>
                <s-table-header format="numeric"><s-stack alignItems='center'>评分</s-stack></s-table-header>
                <s-table-header><s-stack alignItems='center'>评论内容</s-stack></s-table-header>
                <s-table-header listSlot="inline"><s-stack alignItems='center'>状态</s-stack></s-table-header>
                <s-table-header listSlot="inline"><s-stack alignItems='center'>提交时间</s-stack></s-table-header>
                <s-table-header listSlot="labeled"><s-stack alignItems='center'>操作</s-stack></s-table-header>
              </s-table-header-row>
              <s-table-body>
                {comments.map((comment) => (
                  <s-table-row
                    key={comment.id}
                    clickDelegate="mountain-view-checkbox">
                    <s-table-cell>
                      <s-checkbox 
                        onChange={() => handleSelectRow(comment.id)}
                        checked={selectedIds.includes(comment.id)}
                        id="mountain-view-checkbox" />
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>{comment.id}</s-text>
                    </s-table-cell>
                    <s-table-cell>{comment.productId}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small">
                        <s-text type="strong">{comment.author}</s-text>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>{renderStars(comment.rating)}</s-table-cell>
                    <s-table-cell>{comment.content}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={STATUS[comment.status].tone}>
                        {STATUS[comment.status].label}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{new Date(comment.createdAt).toLocaleString()}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small" alignItems='center'>
                        <s-button
                          variant="tertiary"
                          onClick={() => handleOpen(2, comment)}
                        >
                          编辑
                        </s-button>
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => removeComment(comment.id)}
                        >
                          删除
                        </s-button>
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
            {/* 自定义数字分页条 */}
            <s-box paddingBlockStart="small" padding="base">
              <s-stack direction="inline" gap="small" alignItems="center" justifyContent="center">
                {/* 上一页 */}
                <s-button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={handlePreviousPage}
                >
                  上一页
                </s-button>

                {/* 中间页码按钮 */}
                {Array.from({ length: totalPages }, (_, i) => {
                  const page = i + 1;
                  return (
                    <s-button
                      key={page}
                      variant={page === currentPage ? 'primary' : 'secondary'}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </s-button>
                  );
                })}

                {/* 下一页 */}
                <s-button
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={handleNextPage}
                >
                  下一页
                </s-button>
              </s-stack>
            </s-box>
          </>
        )}
      </s-section>

      <s-section heading="管理说明">
        <s-paragraph>
          这是后台评论管理静态页。当前数据保存在浏览器内存中，刷新后会恢复初始状态。
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>待审核：新提交的评论，需商家处理</s-list-item>
          <s-list-item>已通过：可在店铺前台展示</s-list-item>
          <s-list-item>已拒绝：不展示，保留记录</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="后续接入">
        <s-unordered-list>
          <s-list-item>loader：读取评论列表</s-list-item>
          <s-list-item>action：审核 / 删除 / 回复</s-list-item>
          <s-list-item>Theme Extension：前台展示已通过评论</s-list-item>
        </s-unordered-list>
      </s-section>

      
      <s-modal ref={modalRef} size="large" id="review-modal" accessibilityLabel={accessibilityLabel} heading={headingTitle}>
        <ReviewForm 
          onResult={handleResult} 
          isOk={isOk} 
          headingTitle={headingTitle} 
          comment={comment}
        />
      </s-modal>
      
        
      <s-modal id="confirm-modal" heading="确认删除" size="small-100">
        <s-text>确定要删除这条记录吗？此操作不可撤销。</s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          commandFor="confirm-modal"
          command="--hide"
          onClick={handleConfirmDelete}
        >确认删除</s-button>

        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor="confirm-modal"
          command="--hide"
        >取消</s-button>
      </s-modal>









    </s-page>
  )
}
