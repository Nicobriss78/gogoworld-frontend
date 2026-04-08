import { searchUsers, blockUser, unblockUser } from "../api.js";

export async function searchUsersForView(query) {
  return await searchUsers(query);
}

export async function blockUserForView(userId) {
  return await blockUser(userId);
}

export async function unblockUserForView(userId) {
  return await unblockUser(userId);
}
