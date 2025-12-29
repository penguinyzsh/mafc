/**
 * Calls the Gemini API to generate content based on a prompt
 * @param apiKey - Google Gemini API key
 * @param model - Model name (e.g., 'gemini-2.5-flash')
 * @param prompt - User prompt to send to the model
 * @param systemInstruction - Optional system instruction for the model
 * @returns Generated text response
 */
export const callGemini = async (apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<string> => {
    if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is empty or missing');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [
        {
            role: "user",
            parts: [{ text: prompt }]
        }
    ];

    const body: Record<string, unknown> = {
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
        }
    };

    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            return text;
        } else {
            throw new Error("No candidates returned from API");
        }

    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unknown error occurred during API call");
    }
};
