
// src/services/aiService.js

import * as FileSystem from 'expo-file-system/legacy';
import { categories } from '../data/mockData';

// ============================================================
// API KEYS
// ============================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// ============================================================
// GEMINI CONFIGURATION
// Used for image-based AI features.
// ============================================================

const GEMINI_MODEL = 'gemini-3.6-flash';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ============================================================
// GROQ CONFIGURATION
// Used for text + voice features.
// ============================================================

// IMPORTANT:
// llama-3.3-70b-versatile was deprecated by Groq.
// Use a currently supported production model.
const GROQ_MODEL = 'openai/gpt-oss-20b';

const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

const GROQ_CHAT_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

// Debug
console.log(
  'Gemini API loaded:',
  Boolean(GEMINI_API_KEY)
);

console.log(
  'Groq API loaded:',
  Boolean(GROQ_API_KEY)
);

console.log(
  'Groq text model:',
  GROQ_MODEL
);

console.log(
  'Groq Whisper model:',
  GROQ_WHISPER_MODEL
);

// ============================================================
// CATEGORY LIST
// ============================================================

const CATEGORY_LIST_TEXT = categories
  .map((c) => `- ${c.id}: ${c.name}`)
  .join('\n');

// ============================================================
// COMMON TEXT CLEANER
// ============================================================

function cleanAIText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/```text/gi, '')
    .replace(/```/g, '')
    .trim();
}

// ============================================================
// GROQ CHAT HELPER
// ============================================================

async function callGroqChat({
  systemInstruction,
  messages,
  temperature = 0.3,
  maxTokens = 250,
}) {
  if (!GROQ_API_KEY) {
    throw new Error(
      'EXPO_PUBLIC_GROQ_API_KEY is not configured.'
    );
  }

  const response = await fetch(
    GROQ_CHAT_URL,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },

      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,

        messages: [
          {
            role: 'system',
            content: systemInstruction,
          },
          ...messages,
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.log(
      'Groq API error:',
      data
    );

    throw new Error(
      data?.error?.message ||
        `Groq request failed (${response.status})`
    );
  }

  const rawText =
    data?.choices?.[0]?.message?.content || '';

  console.log(
    'Groq raw response:',
    rawText
  );

  console.log(
    'Groq finish reason:',
    data?.choices?.[0]?.finish_reason
  );

  return rawText;
}

// ============================================================
// AI FEATURE 1
// AI SERVICE ASSISTANT
// ============================================================

const SYSTEM_INSTRUCTION = `
You are the "AI Service Assistant" inside a home-services booking app called Local Service Hub.

A customer will describe a problem in their own words.
They may use English, Urdu, or Roman Urdu.

Your job:

1. Understand the customer's problem.
2. Reply in a short, friendly and helpful sentence or two.
3. Decide which ONE category from the list below best matches the problem.
4. If the problem is genuinely unclear, use CATEGORY_ID=null and ask ONE short clarifying question.
5. Never invent a category ID.

Available categories:

${CATEGORY_LIST_TEXT}

IMPORTANT OUTPUT RULES:

Do NOT return JSON.
Do NOT use markdown.
Do NOT use code fences.
Do NOT add explanations before or after the required format.

Return EXACTLY these three lines:

CATEGORY_ID=<one valid category id OR null>
NEEDS_INFO=<true OR false>
REPLY=<short friendly response>

Keep REPLY short, preferably under 25 words.

Example:

CATEGORY_ID=plumbing
NEEDS_INFO=false
REPLY=It sounds like a plumbing issue. You can book a plumber to inspect and fix the problem.

If the problem is unclear:

CATEGORY_ID=null
NEEDS_INFO=true
REPLY=Could you tell me which appliance or area is having the problem?
`;

// ============================================================
// GROQ MESSAGE HISTORY
// ============================================================

function buildGroqMessages(
  history,
  userMessage
) {
  const safeHistory = Array.isArray(history)
    ? history.slice(-6)
    : [];

  const turns = safeHistory
    .filter(
      (m) =>
        m &&
        typeof m.text === 'string' &&
        m.text.trim()
    )
    .map((m) => ({
      role:
        m.role === 'ai'
          ? 'assistant'
          : 'user',
      content: m.text.trim(),
    }));

  turns.push({
    role: 'user',
    content: userMessage,
  });

  return turns;
}

// ============================================================
// PARSE AI ASSISTANT RESPONSE
// ============================================================

function parseAssistantResponse(rawText) {
  const cleaned = cleanAIText(rawText);

  if (!cleaned) {
    throw new Error(
      'Groq returned an empty response.'
    );
  }

  const categoryMatch = cleaned.match(
    /CATEGORY_ID\s*[:=]\s*([^\r\n]+)/i
  );

  let categoryId = null;

  if (
    categoryMatch &&
    categoryMatch[1]
  ) {
    const possibleCategory =
      categoryMatch[1]
        .trim()
        .replace(
          /^["'`]+|["'`,.]+$/g,
          ''
        )
        .trim();

    if (
      possibleCategory &&
      possibleCategory.toLowerCase() !==
        'null' &&
      possibleCategory.toLowerCase() !==
        'none'
    ) {
      const matchingCategory =
        categories.find(
          (c) =>
            String(c.id).toLowerCase() ===
            possibleCategory.toLowerCase()
        );

      if (matchingCategory) {
        categoryId =
          matchingCategory.id;
      }
    }
  }

  const needsInfoMatch = cleaned.match(
    /NEEDS_INFO\s*[:=]\s*(true|false)/i
  );

  const needsMoreInfo =
    needsInfoMatch &&
    needsInfoMatch[1]
      ? needsInfoMatch[1].toLowerCase() ===
        'true'
      : false;

  const replyMatch = cleaned.match(
    /REPLY\s*[:=]\s*([\s\S]*)/i
  );

  let reply = '';

  if (
    replyMatch &&
    replyMatch[1]
  ) {
    reply = replyMatch[1]
      .trim()
      .replace(/^["'`]+/, '')
      .replace(/["'`]+$/, '')
      .trim();
  }

  if (!reply) {
    const lines = cleaned
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(
        (line) =>
          !/^CATEGORY_ID\s*[:=]/i.test(
            line
          ) &&
          !/^NEEDS_INFO\s*[:=]/i.test(
            line
          )
      );

    if (lines.length > 0) {
      reply = lines.join(' ');
    }
  }

  if (!reply) {
    throw new Error(
      'Groq returned no usable reply.'
    );
  }

  return {
    reply,
    categoryId,
    needsMoreInfo,
  };
}

// ============================================================
// AI FEATURE 1
// AI SERVICE ASSISTANT
// ============================================================

export async function askServiceAssistant(
  userMessage,
  history = []
) {
  if (!GROQ_API_KEY) {
    return {
      reply:
        "AI assistant isn't set up yet — add EXPO_PUBLIC_GROQ_API_KEY to your .env file.",
      categoryId: null,
      needsMoreInfo: false,
      error: true,
    };
  }

  if (
    !userMessage ||
    !String(userMessage).trim()
  ) {
    return {
      reply:
        'Please describe the problem you are facing so I can suggest the right service.',
      categoryId: null,
      needsMoreInfo: true,
      error: false,
    };
  }

  try {
    const rawText =
      await callGroqChat({
        systemInstruction:
          SYSTEM_INSTRUCTION,

        messages:
          buildGroqMessages(
            history,
            String(userMessage).trim()
          ),

        temperature: 0.3,
        maxTokens: 250,
      });

    const parsed =
      parseAssistantResponse(
        rawText
      );

    return {
      reply:
        parsed.reply ||
        "Sorry, I couldn't quite understand that — could you rephrase?",

      categoryId:
        parsed.categoryId,

      needsMoreInfo:
        Boolean(
          parsed.needsMoreInfo
        ),

      error: false,
    };
  } catch (err) {
    console.log(
      'askServiceAssistant failed:',
      err?.message
    );

    return {
      reply:
        "Sorry, I'm having trouble responding right now. Please try again in a moment.",

      categoryId: null,
      needsMoreInfo: false,
      error: true,
    };
  }
}

// ============================================================
// AI FEATURE 2
// AI PRICE ESTIMATOR
// ============================================================

const PRICE_ESTIMATOR_SYSTEM_INSTRUCTION = `
You are the "AI Price Estimator" inside a home-services booking app called Local Service Hub.

You will be given:

- a service's normal listed base price in PKR
- the service name
- its category
- a customer's description of their specific problem

Decide whether the described problem sounds like:

- LESS work than a typical job
- TYPICAL work
- MORE work

Then provide a low and high multiplier.

Rules:

- low multiplier must be between 0.6 and 2.0.
- high multiplier must be between 0.6 and 2.0.
- low multiplier must be less than or equal to high multiplier.
- A vague or very short description should stay close to 1.0.
- NOTE must be ONE short friendly sentence under 18 words.

Do NOT return JSON.
Do NOT use markdown.

Return EXACTLY these three lines:

LOW_MULTIPLIER=<number>
HIGH_MULTIPLIER=<number>
NOTE=<short sentence>

Example:

LOW_MULTIPLIER=0.9
HIGH_MULTIPLIER=1.2
NOTE=The issue sounds like a typical job with slightly variable repair effort.
`;

// ============================================================
// LOCAL PRICE FALLBACK
// ============================================================

export function quickEstimateRange(
  basePrice
) {
  if (!basePrice) {
    return null;
  }

  const low =
    Math.round(
      (basePrice * 0.85) / 50
    ) * 50;

  const high =
    Math.round(
      (basePrice * 1.3) / 50
    ) * 50;

  return {
    low,
    high,
    note: null,
    error: false,
  };
}

// ============================================================
// PARSE PRICE RESPONSE
// ============================================================

function parsePriceResponse(
  rawText
) {
  if (
    !rawText ||
    typeof rawText !== 'string'
  ) {
    throw new Error(
      'Groq returned an empty price response.'
    );
  }

  const cleaned =
    cleanAIText(rawText);

  const lowMatch =
    cleaned.match(
      /LOW_MULTIPLIER\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    );

  const highMatch =
    cleaned.match(
      /HIGH_MULTIPLIER\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    );

  const noteMatch =
    cleaned.match(
      /NOTE\s*[:=]\s*([\s\S]*)/i
    );

  const lowMultiplier =
    lowMatch
      ? Number(lowMatch[1])
      : NaN;

  const highMultiplier =
    highMatch
      ? Number(highMatch[1])
      : NaN;

  let note =
    noteMatch?.[1]
      ? noteMatch[1].trim()
      : null;

  if (note) {
    note = note
      .replace(/^["'`]+/, '')
      .replace(/["'`]+$/, '')
      .trim();
  }

  return {
    lowMultiplier,
    highMultiplier,
    note,
  };
}

// ============================================================
// AI PRICE ESTIMATOR
// ============================================================

export async function estimateServicePrice({
  basePrice,
  problemDescription,
  serviceName,
  categoryName,
}) {
  if (!basePrice) {
    return null;
  }

  if (!GROQ_API_KEY) {
    return {
      ...quickEstimateRange(
        basePrice
      ),
      error: true,
    };
  }

  const prompt = `
Service: ${serviceName || 'N/A'}
Category: ${categoryName || 'N/A'}
Listed base price: Rs. ${basePrice}
Customer's problem description: "${problemDescription || ''}"
`;

  try {
    const rawText =
      await callGroqChat({
        systemInstruction:
          PRICE_ESTIMATOR_SYSTEM_INSTRUCTION,

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],

        temperature: 0.2,
        maxTokens: 150,
      });

    const parsed =
      parsePriceResponse(
        rawText
      );

    let low =
      Number(
        parsed.lowMultiplier
      );

    let high =
      Number(
        parsed.highMultiplier
      );

    if (
      !Number.isFinite(low) ||
      !Number.isFinite(high) ||
      low <= 0 ||
      high <= 0
    ) {
      return {
        ...quickEstimateRange(
          basePrice
        ),
        error: true,
      };
    }

    low = Math.min(
      Math.max(low, 0.6),
      2.0
    );

    high = Math.min(
      Math.max(high, low),
      2.0
    );

    return {
      low:
        Math.round(
          (basePrice * low) / 50
        ) * 50,

      high:
        Math.round(
          (basePrice * high) / 50
        ) * 50,

      note:
        typeof parsed.note ===
          'string' &&
        parsed.note.trim()
          ? parsed.note.trim()
          : null,

      error: false,
    };
  } catch (err) {
    console.log(
      'estimateServicePrice failed:',
      err?.message
    );

    return {
      ...quickEstimateRange(
        basePrice
      ),
      error: true,
    };
  }
}

// ============================================================
// AI FEATURE 3
// AI SERVICE DESCRIPTION GENERATOR
// ============================================================

const DESCRIPTION_GENERATOR_SYSTEM_INSTRUCTION = `
You are the "AI Service Description Generator" inside a home-services booking app called Local Service Hub.

Write ONE complete business description for a service provider profile.

Requirements:

- Write 4 to 5 complete sentences.
- Keep it around 60 to 90 words.
- Write naturally and professionally.
- Write in FIRST PERSON.
- Mention the business name.
- Mention the service category.
- Mention the location.
- Mention the years of experience.
- Naturally mention the specific services provided.
- Explain what customers can expect.
- Do not invent facts.
- Do not invent certifications, awards, guarantees, reviews or qualifications.
- Do not use markdown.
- Do not use headings.
- Do not use bullet points.
- Do not use hashtags.
- Do not use emojis.
- Return ONLY the final description.
`;

// ============================================================
// AI SERVICE DESCRIPTION GENERATOR
// ============================================================

export async function generateServiceDescription({
  businessName,
  categoryName,
  experienceYears,
  location,
  serviceNames = [],
}) {
  if (!GROQ_API_KEY) {
    return {
      description: '',
      error: true,
      message:
        "AI description generator isn't set up yet — add EXPO_PUBLIC_GROQ_API_KEY to your .env file.",
    };
  }

  const servicesText =
    Array.isArray(serviceNames) &&
    serviceNames.length > 0
      ? serviceNames.join(', ')
      : 'general services';

  const prompt = `
Create the complete business description now.

Business name: ${businessName || 'N/A'}
Service category: ${categoryName || 'N/A'}
Years of experience: ${experienceYears || 'N/A'}
Location: ${location || 'N/A'}
Services offered: ${servicesText}

Write 4 to 5 complete sentences.

The final description must:

- mention the business name
- mention the service category
- mention the location
- mention the experience
- naturally mention the provided services
- explain what customers can expect
- sound personal and professional
- contain no invented facts
- contain no heading
- contain no bullets
- contain no markdown

Return ONLY the completed description.
`;

  try {
    const rawText =
      await callGroqChat({
        systemInstruction:
          DESCRIPTION_GENERATOR_SYSTEM_INSTRUCTION,

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],

        temperature: 0.5,
        maxTokens: 220,
      });

    let description =
      cleanAIText(rawText)
        .replace(/^["'`]+/, '')
        .replace(/["'`]+$/, '')
        .trim();

    description =
      description.replace(
        /^(about\s+(this\s+)?business|about\s+us|business\s+description)\s*[:\-]\s*/i,
        ''
      ).trim();

    if (!description) {
      throw new Error(
        'Groq returned no usable description.'
      );
    }

    return {
      description,
      error: false,
    };
  } catch (err) {
    console.log(
      'generateServiceDescription failed:',
      err?.message
    );

    return {
      description: '',
      error: true,
      message:
        "Couldn't generate a description right now. Please try again or write your own.",
    };
  }
}

// ============================================================
// GEMINI IMAGE HELPER
// ============================================================

async function urlToBase64(
  imageUrl
) {
  if (!imageUrl) {
    throw new Error(
      'Image URL is missing.'
    );
  }

  const localPath =
    `${FileSystem.cacheDirectory}ai_photo_${Date.now()}.jpg`;

  const downloadResult =
    await FileSystem.downloadAsync(
      imageUrl,
      localPath
    );

  if (!downloadResult?.uri) {
    throw new Error(
      'Could not download image.'
    );
  }

  try {
    const base64 =
      await FileSystem.readAsStringAsync(
        downloadResult.uri,
        {
          encoding:
            FileSystem.EncodingType
              .Base64,
        }
      );

    return base64;
  } finally {
    FileSystem.deleteAsync(
      downloadResult.uri,
      {
        idempotent: true,
      }
    ).catch(() => {});
  }
}

// ============================================================
// GEMINI IMAGE ANALYZER PROMPT
// ============================================================

const IMAGE_ANALYZER_SYSTEM_INSTRUCTION = `
You are the "AI Image Problem Analyzer" inside a home-services booking app called Local Service Hub.

A customer has attached a photo of a problem.

Your job:

1. Look at the photo and identify the visible problem.
2. Decide which ONE category from the list below best matches the problem.
3. If the photo is blurry, unrelated, or does not clearly show a problem, use CATEGORY_ID=null.
4. Never invent details you cannot see.
5. Never invent a category ID.

Available categories:

${CATEGORY_LIST_TEXT}

Return EXACTLY these two lines:

CATEGORY_ID=<one valid category id OR null>
ISSUE=<one short sentence under 25 words>

Example:

CATEGORY_ID=plumbing
ISSUE=The photo shows a leaking pipe joint under the sink.

If nothing useful can be seen:

CATEGORY_ID=null
ISSUE=The photo does not clearly show a specific problem.
`;

// ============================================================
// PARSE IMAGE ANALYSIS
// ============================================================

function parseImageAnalysisResponse(
  rawText
) {
  const cleaned =
    cleanAIText(rawText);

  if (!cleaned) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  const categoryMatch =
    cleaned.match(
      /CATEGORY_ID\s*[:=]\s*([^\r\n]+)/i
    );

  let categoryId = null;

  if (
    categoryMatch &&
    categoryMatch[1]
  ) {
    const possibleCategory =
      categoryMatch[1]
        .trim()
        .replace(
          /^["'`]+|["'`,.]+$/g,
          ''
        )
        .trim();

    if (
      possibleCategory &&
      possibleCategory.toLowerCase() !==
        'null' &&
      possibleCategory.toLowerCase() !==
        'none'
    ) {
      const matchingCategory =
        categories.find(
          (c) =>
            String(c.id).toLowerCase() ===
            possibleCategory.toLowerCase()
        );

      if (matchingCategory) {
        categoryId =
          matchingCategory.id;
      }
    }
  }

  const issueMatch =
    cleaned.match(
      /ISSUE\s*[:=]\s*([\s\S]*)/i
    );

  let issue = '';

  if (
    issueMatch &&
    issueMatch[1]
  ) {
    issue =
      issueMatch[1]
        .trim()
        .replace(/^["'`]+/, '')
        .replace(/["'`]+$/, '')
        .trim();
  }

  if (!issue) {
    const lines =
      cleaned
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter(
          (line) =>
            !/^CATEGORY_ID\s*[:=]/i.test(
              line
            )
        );

    if (lines.length > 0) {
      issue = lines.join(' ');
    }
  }

  if (!issue) {
    throw new Error(
      'Gemini returned no usable issue description.'
    );
  }

  return {
    issue,
    categoryId,
  };
}

// ============================================================
// AI FEATURE 4
// AI IMAGE PROBLEM ANALYZER
// ============================================================

export async function analyzeProblemImage(
  imageUrl
) {
  if (!GEMINI_API_KEY) {
    return {
      issue: '',
      categoryId: null,
      error: true,
      message:
        "AI image analyzer isn't set up yet — add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
    };
  }

  if (!imageUrl) {
    return {
      issue: '',
      categoryId: null,
      error: true,
      message:
        'No photo was provided to analyze.',
    };
  }

  try {
    const base64Image =
      await urlToBase64(
        imageUrl
      );

    const response =
      await fetch(
        GEMINI_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    IMAGE_ANALYZER_SYSTEM_INSTRUCTION,
                },
              ],
            },

            contents: [
              {
                role: 'user',

                parts: [
                  {
                    inline_data: {
                      mime_type:
                        'image/jpeg',
                      data:
                        base64Image,
                    },
                  },

                  {
                    text:
                      'Analyze this photo and identify the visible problem using the required output format.',
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 150,
            },
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.log(
        'Gemini API error:',
        data
      );

      throw new Error(
        data?.error?.message ||
          `Gemini request failed (${response.status})`
      );
    }

    const rawText =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text || '';

    console.log(
      'Gemini image analysis:',
      rawText
    );

    const parsed =
      parseImageAnalysisResponse(
        rawText
      );

    return {
      issue:
        parsed.issue ||
        "Couldn't identify a specific problem from this photo.",

      categoryId:
        parsed.categoryId,

      error: false,
    };
  } catch (err) {
    console.log(
      'analyzeProblemImage failed:',
      err?.message
    );

    return {
      issue: '',
      categoryId: null,
      error: true,
      message:
        "Couldn't analyze this photo right now. Please try again.",
    };
  }
}

// ============================================================
// PHOTO QUALITY CHECKER
// ============================================================

const PHOTO_QUALITY_SYSTEM_INSTRUCTION = `
You are the "AI Photo Quality Checker" inside a home-services booking app called Local Service Hub.

The photo is either:

1. CUSTOMER PROFILE PHOTO
2. BUSINESS PHOTO for a service provider

Judge ONLY whether the photo is suitable.

Check:

- Is it clear?
- Is it well lit?
- Is it blurry or pixelated?
- Does it show the intended subject?
- Is it relevant?
- Is it free from obvious screenshots, memes or unrelated content?

Do NOT look for damage or faults.

Return EXACTLY these two lines:

SUITABLE=<true OR false>
FEEDBACK=<one short friendly sentence under 20 words>

If suitable, give a positive confirmation.

If unsuitable, give ONE practical improvement tip.
`;

// ============================================================
// PARSE PHOTO QUALITY
// ============================================================

function parsePhotoQualityResponse(
  rawText
) {
  const cleaned =
    cleanAIText(rawText);

  if (!cleaned) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  const suitableMatch =
    cleaned.match(
      /SUITABLE\s*[:=]\s*(true|false)/i
    );

  const suitable =
    suitableMatch &&
    suitableMatch[1]
      ? suitableMatch[1].toLowerCase() ===
        'true'
      : true;

  const feedbackMatch =
    cleaned.match(
      /FEEDBACK\s*[:=]\s*([\s\S]*)/i
    );

  let feedback = '';

  if (
    feedbackMatch &&
    feedbackMatch[1]
  ) {
    feedback =
      feedbackMatch[1]
        .trim()
        .replace(/^["'`]+/, '')
        .replace(/["'`]+$/, '')
        .trim();
  }

  if (!feedback) {
    const lines =
      cleaned
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter(
          (line) =>
            !/^SUITABLE\s*[:=]/i.test(
              line
            )
        );

    if (lines.length > 0) {
      feedback =
        lines.join(' ');
    }
  }

  return {
    suitable,
    feedback,
  };
}

// ============================================================
// AI PHOTO QUALITY CHECKER
// ============================================================

export async function analyzePhotoQuality({
  photoUrl,
  context = 'profile',
}) {
  if (!GEMINI_API_KEY) {
    return {
      suitable: true,
      feedback: '',
      error: true,
      message:
        "AI photo checker isn't set up yet — add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
    };
  }

  if (!photoUrl) {
    return {
      suitable: true,
      feedback: '',
      error: true,
      message:
        'No photo was provided to check.',
    };
  }

  const contextText =
    context === 'business'
      ? 'This is a BUSINESS PHOTO for a service provider profile.'
      : 'This is a CUSTOMER PROFILE PHOTO.';

  try {
    const base64Image =
      await urlToBase64(
        photoUrl
      );

    const response =
      await fetch(
        GEMINI_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    PHOTO_QUALITY_SYSTEM_INSTRUCTION,
                },
              ],
            },

            contents: [
              {
                role: 'user',

                parts: [
                  {
                    inline_data: {
                      mime_type:
                        'image/jpeg',
                      data:
                        base64Image,
                    },
                  },

                  {
                    text:
                      `${contextText} Check whether this photo is suitable using the required output format.`,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 120,
            },
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.log(
        'Gemini API error:',
        data
      );

      throw new Error(
        data?.error?.message ||
          `Gemini request failed (${response.status})`
      );
    }

    const rawText =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text || '';

    console.log(
      'Gemini photo quality:',
      rawText
    );

    const parsed =
      parsePhotoQualityResponse(
        rawText
      );

    return {
      suitable:
        parsed.suitable,

      feedback:
        parsed.feedback || '',

      error: false,
    };
  } catch (err) {
    console.log(
      'analyzePhotoQuality failed:',
      err?.message
    );

    // Fail open.
    return {
      suitable: true,
      feedback: '',
      error: true,
      message:
        "Couldn't check this photo right now.",
    };
  }
}

// ============================================================
// VOICE SEARCH
// ============================================================

const TRANSCRIBE_PROMPT_HINT =
  'Local Service Hub home services booking app search: plumbing, electrician, cleaning, AC repair, appliance repair. Customer may speak English, Urdu, or Roman Urdu.';

// ============================================================
// SILENCE PATTERNS
// ============================================================

const SILENCE_HALLUCINATION_PATTERNS = [
  /^you$/i,
  /^thank you\.?$/i,
  /^thanks for watching\.?$/i,
  /^\.+$/,
];

// ============================================================
// VOICE SEARCH TRANSCRIPTION
// ============================================================
//
// IMPORTANT:
// We intentionally DO NOT use:
//
// formData.append('file', { uri, name, type })
//
// because Expo/React Native can throw:
// "Unsupported FormDataPart implementation"
//
// Instead we use expo-file-system's native multipart
// uploadAsync implementation.
// ============================================================

export async function transcribeAudio(
  audioUri
) {
  if (!GROQ_API_KEY) {
    return {
      text: '',
      error: true,
      message:
        "Voice search isn't set up yet — add EXPO_PUBLIC_GROQ_API_KEY to your .env file.",
    };
  }

  if (!audioUri) {
    return {
      text: '',
      error: true,
      message:
        'No recording to transcribe.',
    };
  }

  try {
    console.log(
      'Starting Groq transcription...'
    );

    console.log(
      'Audio URI:',
      audioUri
    );

    const uploadResult =
      await FileSystem.uploadAsync(
        GROQ_TRANSCRIBE_URL,
        audioUri,
        {
          httpMethod: 'POST',

          uploadType:
            FileSystem.FileSystemUploadType
              .MULTIPART,

          fieldName: 'file',

          headers: {
            Authorization:
              `Bearer ${GROQ_API_KEY}`,
          },

          parameters: {
            model:
              GROQ_WHISPER_MODEL,

            prompt:
              TRANSCRIBE_PROMPT_HINT,

            response_format:
              'json',

            temperature:
              '0',
          },
        }
      );

    console.log(
      'Groq transcription HTTP status:',
      uploadResult.status
    );

    console.log(
      'Groq transcription raw body:',
      uploadResult.body
    );

    let data;

    try {
      data =
        JSON.parse(
          uploadResult.body
        );
    } catch {
      data = {
        text:
          uploadResult.body || '',
      };
    }

    if (
      uploadResult.status < 200 ||
      uploadResult.status >= 300
    ) {
      console.log(
        'Groq transcription API error:',
        data
      );

      throw new Error(
        data?.error?.message ||
          `Groq transcription failed (${uploadResult.status})`
      );
    }

    const cleaned =
      String(
        data?.text || ''
      )
        .trim()
        .replace(/^["'`]+/, '')
        .replace(/["'`]+$/, '')
        .trim();

    console.log(
      'Groq transcription text:',
      cleaned
    );

    const isSilence =
      !cleaned ||
      SILENCE_HALLUCINATION_PATTERNS.some(
        (pattern) =>
          pattern.test(cleaned)
      );

    if (isSilence) {
      return {
        text: '',
        error: true,
        message:
          "Couldn't catch that — please try speaking again, closer to the mic.",
      };
    }

    return {
      text: cleaned,
      error: false,
    };
  } catch (err) {
    console.log(
      'transcribeAudio failed:',
      err?.message
    );

    return {
      text: '',
      error: true,
      message:
        "Couldn't process that recording. Please try again.",
    };
  }
}

