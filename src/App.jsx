import React, { useMemo, useState } from 'react';

const STORAGE_KEY = 'share-car-state-v1';

const emptyPost = {
  type: 'offer',
  from: '',
  to: '',
  date: '',
  time: '',
  seats: '1',
  price: '',
  phone: '',
  title: '',
  description: '',
};

const sampleState = {
  currentUserId: null,
  users: [
    {
      id: 'u-demo-driver',
      name: '林师傅',
      phone: '13800000001',
      password: '123456',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-demo-rider',
      name: '小周',
      phone: '13800000002',
      password: '123456',
      createdAt: new Date().toISOString(),
    },
  ],
  posts: [
    {
      id: 'p-demo-offer',
      type: 'offer',
      title: '明早南山到福田，剩 2 座',
      from: '深圳南山',
      to: '深圳福田',
      date: '2026-06-23',
      time: '08:10',
      seats: 2,
      price: '25',
      phone: '13800000001',
      description: '走滨海大道，可在科技园、车公庙附近上车。',
      authorId: 'u-demo-driver',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'p-demo-request',
      type: 'request',
      title: '今晚找车：广州南到天河',
      from: '广州南站',
      to: '广州天河',
      date: '2026-06-22',
      time: '21:00',
      seats: 1,
      price: '可议',
      phone: '13800000002',
      description: '一人一个行李箱，希望能拼到顺路车。',
      authorId: 'u-demo-rider',
      createdAt: new Date().toISOString(),
    },
  ],
  comments: [
    {
      id: 'c-demo',
      postId: 'p-demo-offer',
      authorId: 'u-demo-rider',
      content: '可以在高新园地铁站附近上车吗？',
      createdAt: new Date().toISOString(),
    },
  ],
  ratings: [
    {
      id: 'r-demo',
      postId: 'p-demo-offer',
      authorId: 'u-demo-rider',
      score: 5,
      content: '沟通清楚，路线也很准时。',
      createdAt: new Date().toISOString(),
    },
  ],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : sampleState);
  } catch {
    return normalizeState(sampleState);
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeState(value) {
  return {
    ...sampleState,
    ...(value && typeof value === 'object' ? value : {}),
    currentUserId: value?.currentUserId ?? null,
    users: Array.isArray(value?.users) ? value.users : sampleState.users,
    posts: Array.isArray(value?.posts) ? value.posts : sampleState.posts,
    comments: Array.isArray(value?.comments) ? value.comments : [],
    ratings: Array.isArray(value?.ratings) ? value.ratings : [],
  };
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function typeLabel(type) {
  return type === 'offer' ? '车找人' : '人找车';
}

function App() {
  const [state, setState] = useState(loadState);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  const [postForm, setPostForm] = useState(emptyPost);
  const [filters, setFilters] = useState({ type: 'all', keyword: '' });
  const [activePostId, setActivePostId] = useState(state.posts?.[0]?.id ?? null);
  const [commentText, setCommentText] = useState('');
  const [ratingForm, setRatingForm] = useState({ score: 5, content: '' });
  const [notice, setNotice] = useState('');

  const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;
  const activePost = state.posts.find((post) => post.id === activePostId) ?? state.posts[0] ?? null;

  const usersById = useMemo(() => {
    return Object.fromEntries(state.users.map((user) => [user.id, user]));
  }, [state.users]);

  const filteredPosts = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return state.posts
      .filter((post) => filters.type === 'all' || post.type === filters.type)
      .filter((post) => {
        if (!keyword) return true;
        return [post.title, post.from, post.to, post.description]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filters, state.posts]);

  const activeComments = state.comments.filter((comment) => comment.postId === activePost?.id);
  const activeRatings = state.ratings.filter((rating) => rating.postId === activePost?.id);
  const averageRating = activeRatings.length
    ? (activeRatings.reduce((total, rating) => total + Number(rating.score), 0) / activeRatings.length).toFixed(1)
    : '暂无';

  function updateState(mutator) {
    setState((previous) => saveState(mutator(previous)));
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    const name = authForm.name.trim();
    const phone = authForm.phone.trim();
    const password = authForm.password.trim();

    if (!phone || !password || (authMode === 'register' && !name)) {
      showNotice('请完整填写账号信息');
      return;
    }

    if (authMode === 'login') {
      const user = state.users.find((item) => item.phone === phone && item.password === password);
      if (!user) {
        showNotice('手机号或密码不正确');
        return;
      }
      updateState((previous) => ({ ...previous, currentUserId: user.id }));
      showNotice(`欢迎回来，${user.name}`);
      return;
    }

    if (state.users.some((item) => item.phone === phone)) {
      showNotice('该手机号已注册，请直接登录');
      return;
    }

    const user = {
      id: createId('u'),
      name,
      phone,
      password,
      createdAt: new Date().toISOString(),
    };
    updateState((previous) => ({
      ...previous,
      currentUserId: user.id,
      users: [...previous.users, user],
    }));
    setAuthForm({ name: '', phone: '', password: '' });
    showNotice('注册成功，已为你登录');
  }

  function handleLogout() {
    updateState((previous) => ({ ...previous, currentUserId: null }));
    showNotice('已退出登录');
  }

  function handlePostSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再发帖');
      return;
    }

    const requiredFields = ['title', 'from', 'to', 'date', 'time', 'phone'];
    if (requiredFields.some((field) => !String(postForm[field]).trim())) {
      showNotice('请补充标题、路线、时间和联系方式');
      return;
    }

    const post = {
      ...postForm,
      id: createId('p'),
      seats: Number(postForm.seats) || 1,
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    updateState((previous) => ({
      ...previous,
      posts: [post, ...previous.posts],
    }));
    setPostForm(emptyPost);
    setActivePostId(post.id);
    showNotice('发布成功');
  }

  function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再评论');
      return;
    }
    if (!activePost || !commentText.trim()) {
      showNotice('请填写评论内容');
      return;
    }

    const comment = {
      id: createId('c'),
      postId: activePost.id,
      authorId: currentUser.id,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    updateState((previous) => ({
      ...previous,
      comments: [...previous.comments, comment],
    }));
    setCommentText('');
    showNotice('评论已发布');
  }

  function handleRatingSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再评价');
      return;
    }
    if (!activePost) return;

    const rating = {
      id: createId('r'),
      postId: activePost.id,
      authorId: currentUser.id,
      score: Number(ratingForm.score),
      content: ratingForm.content.trim(),
      createdAt: new Date().toISOString(),
    };

    updateState((previous) => ({
      ...previous,
      ratings: [...previous.ratings, rating],
    }));
    setRatingForm({ score: 5, content: '' });
    showNotice('评价已提交');
  }

  return (
    <div className="app">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brandMark">拼</span>
            <span>顺路拼车</span>
          </div>
          {currentUser ? (
            <div className="userBox">
              <span>{currentUser.name}</span>
              <button className="ghostButton" onClick={handleLogout}>退出</button>
            </div>
          ) : (
            <span className="muted">登录后可发帖、评论和评价</span>
          )}
        </nav>

        <div className="heroGrid">
          <section>
            <p className="eyebrow">社区互助拼车平台</p>
            <h1>找顺路的人，也找合适的车</h1>
            <p className="heroText">
              支持司机发布空座，也支持乘客发布找车需求。注册登录后即可发帖、沟通、评论和评价。
            </p>
            <div className="stats">
              <strong>{state.posts.length}</strong>
              <span>条路线</span>
              <strong>{state.users.length}</strong>
              <span>位用户</span>
              <strong>{state.ratings.length}</strong>
              <span>条评价</span>
            </div>
          </section>

          <section className="card authCard">
            <div className="tabs">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                登录
              </button>
              <button
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                注册
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label>
                  昵称
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    placeholder="例如：张先生"
                  />
                </label>
              )}
              <label>
                手机号
                <input
                  value={authForm.phone}
                  onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                  placeholder="演示账号：13800000001"
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="演示密码：123456"
                />
              </label>
              <button className="primaryButton" type="submit">
                {authMode === 'login' ? '立即登录' : '创建账号'}
              </button>
            </form>
          </section>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <main className="mainGrid">
        <section className="card publishCard">
          <div className="sectionTitle">
            <p className="eyebrow">发布需求</p>
            <h2>发一条拼车帖</h2>
          </div>
          <form className="postForm" onSubmit={handlePostSubmit}>
            <div className="segmented">
              <button
                type="button"
                className={postForm.type === 'offer' ? 'selected' : ''}
                onClick={() => setPostForm({ ...postForm, type: 'offer' })}
              >
                车找人
              </button>
              <button
                type="button"
                className={postForm.type === 'request' ? 'selected' : ''}
                onClick={() => setPostForm({ ...postForm, type: 'request' })}
              >
                人找车
              </button>
            </div>
            <label>
              标题
              <input
                value={postForm.title}
                onChange={(event) => setPostForm({ ...postForm, title: event.target.value })}
                placeholder="例如：周五晚杭州到上海"
              />
            </label>
            <div className="twoColumns">
              <label>
                出发地
                <input
                  value={postForm.from}
                  onChange={(event) => setPostForm({ ...postForm, from: event.target.value })}
                  placeholder="城市/地点"
                />
              </label>
              <label>
                目的地
                <input
                  value={postForm.to}
                  onChange={(event) => setPostForm({ ...postForm, to: event.target.value })}
                  placeholder="城市/地点"
                />
              </label>
            </div>
            <div className="twoColumns">
              <label>
                日期
                <input
                  type="date"
                  value={postForm.date}
                  onChange={(event) => setPostForm({ ...postForm, date: event.target.value })}
                />
              </label>
              <label>
                时间
                <input
                  type="time"
                  value={postForm.time}
                  onChange={(event) => setPostForm({ ...postForm, time: event.target.value })}
                />
              </label>
            </div>
            <div className="twoColumns">
              <label>
                人数/座位
                <input
                  type="number"
                  min="1"
                  value={postForm.seats}
                  onChange={(event) => setPostForm({ ...postForm, seats: event.target.value })}
                />
              </label>
              <label>
                费用
                <input
                  value={postForm.price}
                  onChange={(event) => setPostForm({ ...postForm, price: event.target.value })}
                  placeholder="例如：30 或 可议"
                />
              </label>
            </div>
            <label>
              联系方式
              <input
                value={postForm.phone}
                onChange={(event) => setPostForm({ ...postForm, phone: event.target.value })}
                placeholder="手机号/微信"
              />
            </label>
            <label>
              补充说明
              <textarea
                value={postForm.description}
                onChange={(event) => setPostForm({ ...postForm, description: event.target.value })}
                placeholder="上车点、行李、路线偏好等"
              />
            </label>
            <button className="primaryButton" type="submit">发布拼车帖</button>
          </form>
        </section>

        <section className="listColumn">
          <div className="card toolbar">
            <div className="segmented">
              {[
                ['all', '全部'],
                ['offer', '车找人'],
                ['request', '人找车'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filters.type === value ? 'selected' : ''}
                  onClick={() => setFilters({ ...filters, type: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={filters.keyword}
              onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
              placeholder="搜索出发地、目的地或关键词"
            />
          </div>

          <div className="postList">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className={`card postItem ${activePost?.id === post.id ? 'focused' : ''}`}
                onClick={() => setActivePostId(post.id)}
              >
                <div className="postMeta">
                  <span className={`pill ${post.type}`}>{typeLabel(post.type)}</span>
                  <span>{post.date} {post.time}</span>
                </div>
                <h3>{post.title}</h3>
                <p className="route">{post.from} → {post.to}</p>
                <p className="muted">
                  {post.seats} 人/座 · {post.price || '费用可议'} · {usersById[post.authorId]?.name ?? '匿名'}
                </p>
              </article>
            ))}
            {!filteredPosts.length && (
              <div className="card empty">没有找到匹配的拼车帖</div>
            )}
          </div>
        </section>

        <aside className="card detailCard">
          {activePost ? (
            <>
              <div className="postMeta">
                <span className={`pill ${activePost.type}`}>{typeLabel(activePost.type)}</span>
                <span>{formatTime(activePost.createdAt)} 发布</span>
              </div>
              <h2>{activePost.title}</h2>
              <p className="route large">{activePost.from} → {activePost.to}</p>
              <div className="detailGrid">
                <span>出发时间</span>
                <strong>{activePost.date} {activePost.time}</strong>
                <span>人数/座位</span>
                <strong>{activePost.seats}</strong>
                <span>费用</span>
                <strong>{activePost.price || '可议'}</strong>
                <span>联系</span>
                <strong>{activePost.phone}</strong>
                <span>发布人</span>
                <strong>{usersById[activePost.authorId]?.name ?? '匿名'}</strong>
                <span>平均评分</span>
                <strong>{averageRating}</strong>
              </div>
              <p className="description">{activePost.description || '暂无补充说明'}</p>

              <div className="conversation">
                <h3>评论</h3>
                {activeComments.map((comment) => (
                  <div className="message" key={comment.id}>
                    <strong>{usersById[comment.authorId]?.name ?? '匿名'}</strong>
                    <p>{comment.content}</p>
                    <span>{formatTime(comment.createdAt)}</span>
                  </div>
                ))}
                {!activeComments.length && <p className="muted">暂无评论，来问问细节吧。</p>}
                <form onSubmit={handleCommentSubmit} className="inlineForm">
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="写一条评论"
                  />
                  <button type="submit">发送</button>
                </form>
              </div>

              <div className="conversation">
                <h3>评价</h3>
                {activeRatings.map((rating) => (
                  <div className="message" key={rating.id}>
                    <strong>{'★'.repeat(rating.score)}{'☆'.repeat(5 - rating.score)}</strong>
                    <p>{rating.content || '没有填写文字评价'}</p>
                    <span>{usersById[rating.authorId]?.name ?? '匿名'} · {formatTime(rating.createdAt)}</span>
                  </div>
                ))}
                {!activeRatings.length && <p className="muted">完成拼车后可以留下评价。</p>}
                <form onSubmit={handleRatingSubmit} className="ratingForm">
                  <select
                    value={ratingForm.score}
                    onChange={(event) => setRatingForm({ ...ratingForm, score: event.target.value })}
                  >
                    {[5, 4, 3, 2, 1].map((score) => (
                      <option key={score} value={score}>{score} 星</option>
                    ))}
                  </select>
                  <input
                    value={ratingForm.content}
                    onChange={(event) => setRatingForm({ ...ratingForm, content: event.target.value })}
                    placeholder="评价这次拼车体验"
                  />
                  <button type="submit">评价</button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty">请选择一条拼车帖查看详情</div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
