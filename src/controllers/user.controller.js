import { send } from '../utils/response.js';
import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';

// Nhóm 1, 2, Get/Delete user, API mở rộng #50, #53.
export const register = async (req, res) => send(res, 'CREATED', await authService.register(req.valid));
export const login = async (req, res) => send(res, 'OK', await authService.login(req.valid));
export const logout = async (req, res) => send(res, 'OK', await authService.logout(req.accessToken));
export const refreshToken = async (req, res) => send(res, 'OK', await authService.refreshToken(req.valid));
export const sendVerificationCode = async (req, res) => send(res, 'OK', await authService.sendVerificationCode(req.valid));
export const verifyEmail = async (req, res) => send(res, 'OK', await authService.verifyEmail(req.valid));
export const changePassword = async (req, res) => send(res, 'OK', await authService.changePassword(req.user, req.valid));

export const getUser = async (req, res) => send(res, 'OK', await userService.getProfile(req.user));
export const editUser = async (req, res) => send(res, 'OK', await userService.editProfile(req.user, req.valid, req.file, req));
export const deleteUser = async (req, res) => send(res, 'OK', await userService.deleteAccount(req.user));
export const registerDevice = async (req, res) => send(res, 'OK', await userService.registerDevice(req.user, req.valid));

export const adminListUsers = async (req, res) => send(res, 'OK', await userService.adminListUsers(req.valid));
export const adminSetStatus = async (req, res) => send(res, 'OK', await userService.adminSetStatus(req.user, req.valid));
