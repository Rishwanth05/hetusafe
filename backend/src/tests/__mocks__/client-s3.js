'use strict';

// Prevents any real S3 calls during tests.
// processAndUploadImage() calls s3.send(new PutObjectCommand(...)).
// We mock the class so send() resolves immediately; the URL is constructed
// by the route itself, not returned by S3, so no fake URL is needed here.
const mockSend = jest.fn().mockResolvedValue({});

const S3Client = jest.fn().mockImplementation(() => ({ send: mockSend }));
const PutObjectCommand = jest.fn().mockImplementation((params) => params);

module.exports = { S3Client, PutObjectCommand, mockSend };
