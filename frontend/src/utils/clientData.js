import api from './api.js';

export const getClientData = async () => {
    try {
        const res = await api.userData.getClientData();
        return res.success ? res.data : {};
    } catch (error) {
        
        return {};
    }
};

export const setClientData = async (data) => {
    try {
        const res = await api.userData.updateClientData(data);
        return res.success ? res.data : null;
    } catch (error) {
        
        throw error;
    }
};

export const getSection = async (sectionName) => {
    const all = await getClientData();
    return all && all[sectionName] !== undefined ? all[sectionName] : null;
};

export const setSection = async (sectionName, value) => {
    const payload = {};
    payload[sectionName] = value;
    return await setClientData(payload);
};

export default {
    getClientData,
    setClientData,
    getSection,
    setSection
};
