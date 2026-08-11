import { Router } from 'express';
import { createUser, getUser, updateUser, deleteUser } from '../controllers/userController';

const router = Router();

// Route to create a new user
router.post('/users', createUser);

// Route to get a user by ID
router.get('/users/:id', getUser);

// Route to update a user by ID
router.put('/users/:id', updateUser);

// Route to delete a user by ID
router.delete('/users/:id', deleteUser);

export default router;