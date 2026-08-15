const MEMBER_LINK_TOKEN_KEY = 'member-link-token';

export function captureMemberLinkToken() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const token = fragment.get('token');

  if (!token) {
    return;
  }

  window.sessionStorage.setItem(MEMBER_LINK_TOKEN_KEY, token);
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}

export function getMemberLinkToken() {
  return window.sessionStorage.getItem(MEMBER_LINK_TOKEN_KEY);
}

export function clearMemberLinkToken() {
  window.sessionStorage.removeItem(MEMBER_LINK_TOKEN_KEY);
}
