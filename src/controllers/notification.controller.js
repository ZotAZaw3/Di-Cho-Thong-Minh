import { send } from '../utils/response.js';
import * as notifications from '../services/notification.service.js';

export const list = async (req, res) => send(res, 'OK', await notifications.listForUser(req.user, req.group, req.valid));
export const markRead = async (req, res) => send(res, 'OK', await notifications.markRead(req.user, req.group, req.valid));
