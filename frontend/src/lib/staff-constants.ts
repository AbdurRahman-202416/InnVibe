/** Name of the httpOnly cookie that holds the staff token. Shared by middleware and server code. */
export const STAFF_COOKIE = 'innvibe_staff';
/** Cookie lifetime (seconds). Matches the 8 hour token lifetime in the API. */
export const STAFF_SESSION_SECONDS = 8 * 60 * 60;
