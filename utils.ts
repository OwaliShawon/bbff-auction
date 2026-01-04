export const generateUUID = (): string => {
    // Fallback for secure contexts (HTTPS/localhost)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Insecure context fallback
        }
    }
    // Simple fallback for insecure contexts
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};
