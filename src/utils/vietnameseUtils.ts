// This file contains utility functions for Vietnamese language processing.

export const normalizeVietnameseText = (text: string): string => {
    // Normalize Vietnamese text by replacing accented characters with their unaccented counterparts
    const accents = [
        { base: 'a', letters: 'áàảãạâấầẩẫậăắằẳẵặ' },
        { base: 'e', letters: 'éèẻẽẹêếềểễệ' },
        { base: 'i', letters: 'íìỉĩị' },
        { base: 'o', letters: 'óòỏõọôốồổỗộơớờởỡợ' },
        { base: 'u', letters: 'úùủũụôốồổỗộơớờởỡợ' },
        { base: 'y', letters: 'ýỳỷỹỵ' },
        { base: 'd', letters: 'đ' },
    ];

    for (const accent of accents) {
        const regex = new RegExp(`[${accent.letters}]`, 'g');
        text = text.replace(regex, accent.base);
    }

    return text;
};

export const splitVietnameseText = (text: string): string[] => {
    // Split Vietnamese text into words based on spaces and punctuation
    return text.split(/[\s.,!?]+/).filter(Boolean);
};

export const getVietnameseCharacterCount = (text: string): number => {
    // Count the number of characters in a Vietnamese text
    return text.replace(/\s/g, '').length;
};