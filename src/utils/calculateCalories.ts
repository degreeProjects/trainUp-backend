import { GoogleGenAI } from "@google/genai";
import config from "../env.config";
import Post from "../models/post";

const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
});

interface TrainingHistoryStats {
    totalSessions: number;       // Number of posts logged in the last 30 days
    avgSessionsPerWeek: number;  // Derived from totalSessions / ~4.3 weeks
    favoriteType: string | null; // Training type with the highest session count
    uniqueTypesCount: number;    // How many distinct training types were performed
    typesBreakdown: Record<string, number>; // { "Running": 5, "Gym": 3, ... }
}

/**
 * Queries the user's training posts from the last 30 days and computes
 * aggregate statistics (frequency, variety, favourite activity) that are.
 */
async function getUserTrainingHistory(userId: string): Promise<TrainingHistoryStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPosts = await Post.find({
        user: userId,
        createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    // Count occurrences of each training type to build the breakdown map.
    const typesBreakdown: Record<string, number> = {};
    for (const post of recentPosts) {
        typesBreakdown[post.type] = (typesBreakdown[post.type] || 0) + 1;
    }

    const totalSessions = recentPosts.length;
    // Divide by ~4.3 because a 30-day period spans roughly 4.3 weeks.
    const avgSessionsPerWeek = Math.round((totalSessions / 4.3) * 10) / 10;
    const uniqueTypesCount = Object.keys(typesBreakdown).length;

    // Find the training type the user performed most often.
    let favoriteType: string | null = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(typesBreakdown)) {
        if (count > maxCount) {
            maxCount = count;
            favoriteType = type;
        }
    }

    return { totalSessions, avgSessionsPerWeek, favoriteType, uniqueTypesCount, typesBreakdown };
}

/**
 * Main entry point for the calories feature.
 * Fetches the user's training history, builds a personalised prompt, and
 * calls the Gemini API to estimate the calorie burn range for the session.
 */
export async function calculateCaloriesBurn(
    userId: string,
    trainingType: string,
    trainingLength: number,
    height: number,
    weight: number,
    age: number
) {
    const history = await getUserTrainingHistory(userId);

    // Build a training-history section so Gemini can adjust for fitness level.
    let historyContext = "";
    if (history.totalSessions > 0) {
        // Summarise the breakdown as a readable comma-separated string.
        const breakdown = Object.entries(history.typesBreakdown)
            .map(([type, count]) => `${type}: ${count}`)
            .join(", ");

        // Active users: higher fitness level → improved calorie-burn efficiency.
        historyContext = `
    Training History (last 30 days):
    - Total sessions: ${history.totalSessions}
    - Average sessions/week: ${history.avgSessionsPerWeek}
    - Favorite activity: ${history.favoriteType}
    - Activity variety: ${history.uniqueTypesCount} different types (${breakdown})
    Consider: More consistent trainers tend to have higher cardiovascular fitness, which can affect calorie burn efficiency.`;
    } else {
        // No recent posts: treat the user as a beginner or someone returning from a break.
        historyContext = `
    Training History: No recent sessions logged (likely a beginner or returning after a break).
    Consider: Beginners typically burn more calories per session due to lower movement efficiency.`;
    }

    // Compose the full prompt: static profile + dynamic history context.
    const contents = `User Profile: ${height}cm, ${weight}kg, ${age} years old.
    Activity: ${trainingType} for ${trainingLength} minutes.
    ${historyContext}
    Task: Based on the profile AND training history, provide ONLY the estimated calorie burn range (e.g. 300-400). No prose.`;
    

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
    });

    return `You burn: ${response.text} in this training`;
}
