import * as userRepository from '../repositories/user.repository.js';
import roles from '../data/roles.json' with { type: 'json' };
import formatter from '../utils/formatter.mjs'; 

export const initPermissions = () => {
    console.log("Permissions initialized");
};

export const getPublicUsers = async () => {
    const users = await userRepository.findAll();

    return users.map(u => ({ 
        id: u.id, 
        name: formatter.formatName(u.name),
        roleName: roles[u.roleId] || 'Unknown' 
    }));
};
