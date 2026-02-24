import { GoogleGenAI } from "@google/genai";
import config from "../env.config";

const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
});

export async function calculateCaloriesBurn(
    trainingType: string,
    trainingLength: number,
    height: number,
    weight: number,
    age: number
) {
    // Keep the prompt terse and deterministic so the UI can display just the
    // numeric calorie range without additional parsing.
    const contents = `User Profile: ${height}cm, ${weight}kg, ${age} years old. 
    Activity: ${trainingType} for ${trainingLength} minutes. 
    Task: Provide ONLY the estimated calorie burn range (e.g. 300-400). No prose.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
    });

    return `You burn: ${response.text} in this training`;
}
