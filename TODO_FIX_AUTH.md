# Fix 401 Unauthorized Error in CodingRound Component

## Current Issue

- Frontend `submitToBackend` function uses `fetch` without Authorization header
- Backend `/api/coding/run-tests` route requires authentication (protected by `authenticateToken` middleware)
- Token is stored in localStorage as 'token', but not included in fetch requests

## Tasks

- [ ] Update `submitToBackend` in `CodingRound.tsx` to use `codingAPI.runTests` from `api.js` instead of fetch
- [ ] Check and update other fetch calls in `CodingRound.tsx` (submission history and saving) to use axios with auth
- [ ] Ensure `VITE_API_URL` is set in `.env` for correct base URL
- [ ] Test the fix to confirm 401 error is resolved

## Files to Edit

- `a/src/components/CodingRound.tsx`: Replace fetch calls with axios API calls
- `a/src/services/api.js`: Add submissions API methods if needed (or use api directly)

## Next Steps After Fix

- Run the application and test code submission
- Verify that Authorization header is included in requests
- Check backend logs for successful authentication
