import React, { useContext } from 'react';
import { useUser } from '../../contexts/UserContext';
import { isUserRuntimeEnabled } from '../../services/runtimeFlags';
import styles from './UserProfile.module.css';

export const UserProfile: React.FC = () => {
    const { user, updateUser } = useUser();

    const safeUser = user ?? {
        id: 'local-user',
        username: 'operator',
        email: '',
        preferences: '',
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        updateUser({ ...safeUser, [name]: value });
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    return (
        <div className={styles.userProfile}>
            <h2>User Profile</h2>
            <p className={styles.localOnlyNotice}>
                {isUserRuntimeEnabled
                    ? 'Runtime-backed profile surface. Changes sync to the active backend user contract.'
                    : 'Local-only profile surface. Changes update in-memory state and are not synced to a live backend user API.'}
            </p>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={safeUser.username ?? safeUser.name ?? ''}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={safeUser.email}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label htmlFor="preferences">Preferences:</label>
                    <input
                        type="text"
                        id="preferences"
                        name="preferences"
                        value={typeof safeUser.preferences === 'string' ? safeUser.preferences : JSON.stringify(safeUser.preferences ?? {})}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
};

export default UserProfile;
