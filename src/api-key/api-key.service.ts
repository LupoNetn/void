import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateApiKey, hashApiKey } from '../common/utils/api-key.util.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(organizationId: string, dto: CreateApiKeyDto) {
    const { name, environment = 'live' } = dto;
    const { rawKey, prefix, keyHash } = generateApiKey(environment);

    try {
      const apiKey = await this.prisma.apiKey.create({
        data: {
          organizationId,
          name,
          prefix,
          keyHash,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          createdAt: true,
        },
      });

      return {
        message: 'API Key created successfully. Store this secret key securely as it will not be shown again.',
        apiKey,
        rawKey, 
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('An API key with this hash already exists.');
        }
      }
      throw new InternalServerErrorException('An error occurred while creating the API key.');
    }
  }

  async listKeys(organizationId: string) {
    try {
      const keys = await this.prisma.apiKey.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          prefix: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        message: 'API Keys retrieved successfully',
        data: keys,
      };
    } catch {
      throw new InternalServerErrorException('An error occurred while retrieving API keys.');
    }
  }

  async revokeKey(organizationId: string, keyId: string) {
    try {
      const existingKey = await this.prisma.apiKey.findFirst({
        where: { id: keyId, organizationId },
      });

      if (!existingKey) {
        throw new NotFoundException('API Key not found or does not belong to this organization.');
      }

      if (existingKey.revokedAt) {
        throw new BadRequestException('This API Key has already been revoked.');
      }

      const revokedKey = await this.prisma.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
        select: {
          id: true,
          name: true,
          prefix: true,
          revokedAt: true,
        },
      });

      return {
        message: 'API Key revoked successfully',
        data: revokedKey,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while revoking the API key.');
    }
  }

  async validateKey(rawKey: string): Promise<OrganizationJwtPayload> {
    if (!rawKey || !rawKey.startsWith('vod_')) {
      throw new UnauthorizedException('Invalid API Key format.');
    }

    const keyHash = hashApiKey(rawKey);

    try {
      const apiKeyRecord = await this.prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              slug: true,
            },
          },
        },
      });

      if (!apiKeyRecord) {
        throw new UnauthorizedException('Invalid or unknown API Key.');
      }

      if (apiKeyRecord.revokedAt) {
        throw new UnauthorizedException('This API Key has been revoked.');
      }

      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('This API Key has expired.');
      }

      // Async fire-and-forget lastUsedAt update
      this.prisma.apiKey
        .update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});

      return {
        sub: apiKeyRecord.organization.id,
        name: apiKeyRecord.organization.name,
        email: apiKeyRecord.organization.email,
        slug: apiKeyRecord.organization.slug,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while validating the API key.');
    }
  }
}
