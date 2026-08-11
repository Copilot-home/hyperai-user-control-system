import axios from 'axios';
import { User } from '../../types/user.types';
import { isUserRuntimeEnabled } from '../runtimeFlags';
import { getApiBaseUrl } from '../runtimeConfig';

const normalizeUser = (payload: any): User => ({
    id: payload?.id ?? 'local-user',
    name: payload?.name ?? payload?.username ?? 'operator',
    email: payload?.email ?? '',
    preferences:
        typeof payload?.preferences === 'object' && payload?.preferences !== null
            ? payload.preferences
            : {
                  language: 'vi',
                  theme: 'light',
                  notificationsEnabled: true,
              },
});

export const getCurrentUser = async (): Promise<User> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    const response = await axios.get(`${getApiBaseUrl()}/users/current`);
    return normalizeUser(response.data);
};

export const upsertCurrentUser = async (userData: Partial<User>): Promise<User> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    const response = await axios.put(`${getApiBaseUrl()}/users/current`, userData);
    return normalizeUser(response.data);
};

// Function to get user details
export const getUserDetails = async (userId: string): Promise<User> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    const response = await axios.get(`${getApiBaseUrl()}/users/${userId}`);
    return normalizeUser(response.data);
};

// Function to update user details
export const updateUserDetails = async (userId: string, userData: Partial<User>): Promise<User> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    const response = await axios.put(`${getApiBaseUrl()}/users/${userId}`, userData);
    return normalizeUser(response.data);
};

// Function to delete a user
export const deleteUser = async (userId: string): Promise<void> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    await axios.delete(`${getApiBaseUrl()}/users/${userId}`);
};

// Function to create a new user
export const createUser = async (userData: User): Promise<User> => {
    if (!isUserRuntimeEnabled) {
        throw new Error('User runtime is disabled in the current local contract.');
    }
    const response = await axios.post(`${getApiBaseUrl()}/users`, userData);
    return normalizeUser(response.data);
};
