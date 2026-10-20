import { createSlice } from '@reduxjs/toolkit';

const savedTheme = localStorage.getItem('sms_accent_theme') || 'forest';
document.documentElement.dataset.theme = savedTheme;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeTab: 'dashboard', // dashboard, devices, sms, audit
    accentTheme: savedTheme,
    sidebarOpen: true,
    mobileMenuOpen: false,
    pullModalOpen: false,
    selectedDevice: null,
    deleteModalOpen: false,
    messageToDelete: null,
    filterDeviceId: null,
    filterUserId: null,
    activeSyncJob: null // { requestId, deviceName, status: 'triggered'|'in_progress'|'completed'|'failed', count, time }
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      state.mobileMenuOpen = false; // Auto close mobile drawer on navigate
    },
    setAccentTheme: (state, action) => {
      state.accentTheme = action.payload;
      document.documentElement.dataset.theme = action.payload;
      localStorage.setItem('sms_accent_theme', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action) => {
      state.mobileMenuOpen = action.payload;
    },
    openPullModal: (state, action) => {
      state.selectedDevice = action.payload || null;
      state.pullModalOpen = true;
    },
    closePullModal: (state) => {
      state.pullModalOpen = false;
      state.selectedDevice = null;
    },
    openDeleteModal: (state, action) => {
      state.messageToDelete = action.payload;
      state.deleteModalOpen = true;
    },
    closeDeleteModal: (state) => {
      state.deleteModalOpen = false;
      state.messageToDelete = null;
    },
    setFilterDevice: (state, action) => {
      state.filterDeviceId = action.payload.deviceId || null;
      state.filterUserId = action.payload.userId || null;
      state.activeTab = 'sms'; // Automatically switch to SMS inbox
    },
    clearFilterDevice: (state) => {
      state.filterDeviceId = null;
      state.filterUserId = null;
    },
    setActiveSyncJob: (state, action) => {
      state.activeSyncJob = action.payload;
    },
    clearActiveSyncJob: (state) => {
      state.activeSyncJob = null;
    }
  }
});

export const {
  setActiveTab,
  setAccentTheme,
  toggleSidebar,
  toggleMobileMenu,
  setMobileMenuOpen,
  openPullModal,
  closePullModal,
  openDeleteModal,
  closeDeleteModal,
  setFilterDevice,
  clearFilterDevice,
  setActiveSyncJob,
  clearActiveSyncJob
} = uiSlice.actions;

export default uiSlice.reducer;
