export function calculateEmpathyScore(userInput: string, context: any): number {
    // Basic empathy score calculation based on user input and context
    let score = 0;

    // Example logic: Increase score based on certain keywords
    const keywords = ['understand', 'feel', 'support', 'care'];
    keywords.forEach(keyword => {
        if (userInput.includes(keyword)) {
            score += 10; // Increment score for each keyword found
        }
    });

    // Adjust score based on context (this is a placeholder for more complex logic)
    if (context && context.situation === 'stressful') {
        score += 5; // Additional points for stressful situations
    }

    return score;
}

export function analyzeEmpathyTrends(empathyScores: number[]): { average: number; max: number; min: number } {
    const total = empathyScores.reduce((acc, score) => acc + score, 0);
    const average = total / empathyScores.length;
    const max = Math.max(...empathyScores);
    const min = Math.min(...empathyScores);

    return { average, max, min };
}