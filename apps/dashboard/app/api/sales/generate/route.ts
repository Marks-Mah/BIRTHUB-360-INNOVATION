import { NextRequest, NextResponse } from 'next/server';
import { generateSchema } from '@/lib/sales-os/schemas';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate input
        const result = generateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.format() }, { status: 400 });
        }

        const { prompt, systemInstruction } = result.data;

        // In a real scenario, this would call the Python Agents API or Gemini backend directly.
        // For now, it returns a mock response to demonstrate the pattern.

        console.log("Mock API received:", { prompt, systemInstruction });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return NextResponse.json({
            text: "MOCK SERVER RESPONSE: This content was generated via the Next.js API route. The backend integration is working."
        });
    } catch (e) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
