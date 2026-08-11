import axios from 'axios';

const API_BASE_URL = 'https://api.hyperai.com'; // Replace with your actual API base URL

// Function to handle GET requests
const getRequest = async (endpoint: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        return response.data;
    } catch (error) {
        console.error('Error during GET request:', error);
        throw error;
    }
};

// Function to handle POST requests
const postRequest = async (endpoint: string, data: any) => {
    try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Error during POST request:', error);
        throw error;
    }
};

// Function to handle PUT requests
const putRequest = async (endpoint: string, data: any) => {
    try {
        const response = await axios.put(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Error during PUT request:', error);
        throw error;
    }
};

// Function to handle DELETE requests
const deleteRequest = async (endpoint: string) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}${endpoint}`);
        return response.data;
    } catch (error) {
        console.error('Error during DELETE request:', error);
        throw error;
    }
};

// Exporting the API service functions
export const apiService = {
    getRequest,
    postRequest,
    putRequest,
    deleteRequest,
};