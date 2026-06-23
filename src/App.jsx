import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

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

const emptyState = {
  users: [],
  posts: [],
  comments: [],
  ratings: [],
};

function phoneToEmail(phone) {
  const normalized = phone.replace(/\D/g, '');
  return `${normalized}@runlongyuan-users.com`;
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
  };
}

function mapPost(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    from: row.origin,
    to: row.destination,
    date: row.date,
    time: String(row.time || '').slice(0, 5),
    seats: row.seats,
    price: row.price || '',
    phone: row.phone,
    description: row.description || '',
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

function mapComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapRating(row) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    score: row.score,
    content: row.content || '',
    createdAt: row.created_at,
  };
}

async function loadSharedState() {
  const [profilesResult, postsResult, commentsResult, ratingsResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
    supabase.from('ratings').select('*').order('created_at', { ascending: true }),
  ]);

  for (const result of [profilesResult, postsResult, commentsResult, ratingsResult]) {
    if (result.error) throw result.error;
  }

  return {
    users: profilesResult.data.map(mapProfile),
    posts: postsResult.data.map(mapPost),
    comments: commentsResult.data.map(mapComment),
    ratings: ratingsResult.data.map(mapRating),
  };
}

async function loadCurrentUser(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return mapProfile(data);
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

function getTripDateTime(post) {
  return new Date(`${post.date}T${post.time || '00:00'}`);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isExpiredPost(post) {
  return getTripDateTime(post) < new Date();
}

function isInTimeRange(post, range) {
  if (range === 'all') return true;

  const tripTime = getTripDateTime(post);
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const nextWeek = addDays(today, 7);

  if (range === 'active') {
    return tripTime >= new Date();
  }
  if (range === 'today') {
    return tripTime >= today && tripTime < tomorrow;
  }
  if (range === 'tomorrow') {
    return tripTime >= tomorrow && tripTime < dayAfterTomorrow;
  }
  if (range === 'week') {
    return tripTime >= today && tripTime < nextWeek;
  }

  return true;
}

function App() {
  const [state, setState] = useState(emptyState);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  const [postForm, setPostForm] = useState(emptyPost);
  const [filters, setFilters] = useState({ type: 'all', timeRange: 'active', keyword: '' });
  const [activePostId, setActivePostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [ratingForm, setRatingForm] = useState({ score: 5, content: '' });
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setCurrentUser(session?.user ? await loadCurrentUser(session.user.id) : null);
      } catch {
        setCurrentUser(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function initialize() {
    setIsLoading(true);
    try {
      const [{ data: sessionData }, sharedState] = await Promise.all([
        supabase.auth.getSession(),
        loadSharedState(),
      ]);
      setState(sharedState);
      setActivePostId((previous) => previous || sharedState.posts[0]?.id || null);
      setCurrentUser(sessionData.session?.user ? await loadCurrentUser(sessionData.session.user.id) : null);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshState(preferredPostId) {
    const sharedState = await loadSharedState();
    setState(sharedState);
    setActivePostId((previous) => {
      if (preferredPostId !== undefined) {
        return preferredPostId || sharedState.posts[0]?.id || null;
      }
      return previous || sharedState.posts[0]?.id || null;
    });
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  }

  const activePost = state.posts.find((post) => post.id === activePostId) ?? state.posts[0] ?? null;

  const usersById = useMemo(() => {
    return Object.fromEntries(state.users.map((user) => [user.id, user]));
  }, [state.users]);

  const filteredPosts = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return state.posts
      .filter((post) => filters.type === 'all' || post.type === filters.type)
      .filter((post) => isInTimeRange(post, filters.timeRange))
      .filter((post) => {
        if (!keyword) return true;
        return [post.title, post.from, post.to, post.description]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      });
  }, [filters, state.posts]);

  const activeComments = state.comments.filter((comment) => comment.postId === activePost?.id);
  const activeRatings = state.ratings.filter((rating) => rating.postId === activePost?.id);
  const averageRating = activeRatings.length
    ? (activeRatings.reduce((total, rating) => total + Number(rating.score), 0) / activeRatings.length).toFixed(1)
    : '暂无';
  const canDeleteActivePost = Boolean(
    currentUser && activePost && (activePost.authorId === currentUser.id || currentUser.isAdmin),
  );

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const name = authForm.name.trim();
    const phone = authForm.phone.trim();
    const password = authForm.password.trim();

    if (!phone || !password || (authMode === 'register' && !name)) {
      showNotice('请完整填写账号信息');
      return;
    }

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: phoneToEmail(phone),
          password,
        });
        if (error) throw error;
        const profile = await loadCurrentUser(data.user.id);
        setCurrentUser(profile);
        showNotice(`欢迎回来，${profile.name}`);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: phoneToEmail(phone),
          password,
          options: { data: { name, phone } },
        });
        if (error) throw error;
        if (!data.session) {
          throw new Error('注册成功但未自动登录。请在 Supabase Auth 设置里关闭邮箱确认后再试。');
        }

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          phone,
        });
        if (profileError) throw profileError;

        const profile = await loadCurrentUser(data.user.id);
        setCurrentUser(profile);
        setAuthForm({ name: '', phone: '', password: '' });
        await refreshState();
        showNotice('注册成功，已为你登录');
      }
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    showNotice('已退出登录');
  }

  async function handlePostSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再发帖');
      return;
    }

    const payload = {
      type: postForm.type,
      title: postForm.title.trim(),
      origin: postForm.from.trim(),
      destination: postForm.to.trim(),
      date: postForm.date,
      time: postForm.time,
      seats: Math.max(1, Number(postForm.seats) || 1),
      price: postForm.price.trim(),
      phone: postForm.phone.trim(),
      description: postForm.description.trim(),
      author_id: currentUser.id,
    };

    if (!payload.title || !payload.origin || !payload.destination || !payload.date || !payload.time || !payload.phone) {
      showNotice('请补充标题、路线、时间和联系方式');
      return;
    }

    try {
      const { data, error } = await supabase.from('posts').insert(payload).select('*').single();
      if (error) throw error;
      setPostForm(emptyPost);
      await refreshState(data.id);
      showNotice('发布成功，所有访问者现在都能看到');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再评论');
      return;
    }
    if (!activePost || !commentText.trim()) {
      showNotice('请填写评论内容');
      return;
    }

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: activePost.id,
        author_id: currentUser.id,
        content: commentText.trim(),
      });
      if (error) throw error;
      setCommentText('');
      await refreshState(activePost.id);
      showNotice('评论已发布');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleRatingSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再评价');
      return;
    }
    if (!activePost) return;

    try {
      const { error } = await supabase.from('ratings').insert({
        post_id: activePost.id,
        author_id: currentUser.id,
        score: Number(ratingForm.score),
        content: ratingForm.content.trim(),
      });
      if (error) throw error;
      setRatingForm({ score: 5, content: '' });
      await refreshState(activePost.id);
      showNotice('评价已提交');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleDeletePost() {
    if (!activePost || !canDeleteActivePost) return;

    const confirmed = window.confirm('确定删除这条拼车帖吗？评论和评价也会一起删除。');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', activePost.id);
      if (error) throw error;
      await refreshState(null);
      showNotice('帖子已删除');
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brandMark">拼</span>
            <span>润珑苑顺路拼车</span>
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
            <p className="eyebrow">润珑苑小区互助拼车平台</p>
            <h1>找顺路的人，也找合适的车</h1>
            <p className="heroText">
              数据已接入 Supabase，居民在不同设备上发布的拼车、评论和评价会共享展示。
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
                    placeholder="例如：3 栋张先生"
                  />
                </label>
              )}
              <label>
                手机号
                <input
                  value={authForm.phone}
                  onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                  placeholder="用于注册和登录"
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="至少 6 位"
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
                placeholder="例如：明早润珑苑到科技园"
              />
            </label>
            <div className="twoColumns">
              <label>
                出发地
                <input
                  value={postForm.from}
                  onChange={(event) => setPostForm({ ...postForm, from: event.target.value })}
                  placeholder="润珑苑/地铁站/商圈"
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
          <div className="safetyBox">
            <h3>安全提示</h3>
            <p>拼车前请自行核实对方身份、路线和车辆信息，建议在小区门口等公共区域上下车。</p>
            <p>费用、上车点、行李和绕路情况请提前沟通清楚。平台仅提供信息发布与邻里互助撮合，不参与线下交易和行程履约。</p>
          </div>
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
            <div className="segmented timeSegmented">
              {[
                ['active', '未过期'],
                ['today', '今天'],
                ['tomorrow', '明天'],
                ['week', '本周'],
                ['all', '全部时间'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filters.timeRange === value ? 'selected' : ''}
                  onClick={() => setFilters({ ...filters, timeRange: value })}
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
            {isLoading && <div className="card empty">正在加载共享数据...</div>}
            {!isLoading && filteredPosts.map((post) => (
              <article
                key={post.id}
                className={`card postItem ${activePost?.id === post.id ? 'focused' : ''}`}
                onClick={() => setActivePostId(post.id)}
              >
                <div className="postMeta">
                  <span className={`pill ${post.type}`}>{typeLabel(post.type)}</span>
                  <span>{post.date} {post.time}{isExpiredPost(post) ? ' · 已过期' : ''}</span>
                </div>
                <h3>{post.title}</h3>
                <p className="route">{post.from} → {post.to}</p>
                <p className="muted">
                  {post.seats} 人/座 · {post.price || '费用可议'} · {usersById[post.authorId]?.name ?? '匿名'}
                </p>
              </article>
            ))}
            {!isLoading && !filteredPosts.length && (
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
              {canDeleteActivePost && (
                <button className="dangerButton" type="button" onClick={handleDeletePost}>
                  删除帖子
                </button>
              )}
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
