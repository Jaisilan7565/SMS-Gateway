import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('sms_admin_token');
let user = null;
try {
  user = JSON.parse(localStorage.getItem('sms_admin_user') || 'null');
} catch {
  user = null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: token || null,
    user: user || null,
    isAuthenticated: Boolean(token)
  },
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('sms_admin_token', action.payload.accessToken);
      localStorage.setItem('sms_admin_user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sms_admin_token');
      localStorage.removeItem('sms_admin_user');
    }
  }
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;
