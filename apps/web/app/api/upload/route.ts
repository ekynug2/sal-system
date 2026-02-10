
import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        // Ensure user is authenticated
        if (!user) {
            return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return errorResponse('VALIDATION_ERROR', 'No file uploaded', 400);
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return errorResponse('VALIDATION_ERROR', 'Invalid file type. Only PNG and JPG are allowed.', 400);
        }

        // Validate file size (e.g. 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            return errorResponse('VALIDATION_ERROR', 'File too large. Maximum size is 2MB.', 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Use a consistent name or timestamp.
        // For settings (logo/letterhead), maybe we want to keep it simple?
        // But preventing cache issues is good.
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        const url = `/uploads/${filename}`;

        return successResponse({ url });
    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to upload file', 500);
    }
}
