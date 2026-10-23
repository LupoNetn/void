import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProviderDTO } from './dto/create-provider.dto.js';
import {
  decryptData,
  encryptData,
  maskSensitiveValue,
} from '../common/utils/encryption.util.js';

@Injectable()
export class ProviderCredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  
  private validateProviderCredentials(provider: string, creds: Record<string, any>) {
    const prov = provider.toLowerCase();

    if (['sendgrid', 'resend', 'postmark'].includes(prov)) {
      if (!creds.apiKey || typeof creds.apiKey !== 'string') {
        throw new BadRequestException(`Provider '${provider}' requires an 'apiKey' string in credentials.`);
      }
    } else if (prov === 'twilio') {
      if (!creds.accountSid || !creds.authToken) {
        throw new BadRequestException(
          "Provider 'twilio' requires 'accountSid' and 'authToken' in credentials.",
        );
      }
    } else if (prov === 'smtp') {
      if (!creds.host || !creds.port || !creds.user || !creds.pass) {
        throw new BadRequestException(
          "Provider 'smtp' requires 'host', 'port', 'user', and 'pass' in credentials.",
        );
      }
    }
  }

  
  private maskCredentials(creds: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(creds)) {
      if (['apiKey', 'authToken', 'pass', 'privateKey', 'secret'].includes(key)) {
        masked[key] = maskSensitiveValue(String(value));
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  
  async upsertCredential(organizationId: string, body: CreateProviderDTO) {
    const { channel, provider, credentials, active = true } = body;
    const normalizedProvider = provider.toLowerCase().trim();

    this.validateProviderCredentials(normalizedProvider, credentials);

    
    const encryptedPayload = encryptData(credentials);

    try {
    
      const saved = await this.prisma.providerCredential.upsert({
        where: {
          organizationId_channel: {
            organizationId,
            channel,
          },
        },
        update: {
          provider: normalizedProvider,
          credentials: { encrypted: encryptedPayload },
          active,
        },
        create: {
          organizationId,
          channel,
          provider: normalizedProvider,
          credentials: { encrypted: encryptedPayload },
          active,
        },
        select: {
          id: true,
          channel: true,
          provider: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: `Provider '${normalizedProvider}' configured successfully for ${channel}.`,
        data: {
          ...saved,
          credentials: this.maskCredentials(credentials),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to save provider credential.');
    }
  }

  /**
   * Lists all configured channel providers for an organization (with sensitive secrets masked).
   */
  async listCredentials(organizationId: string) {
    try {
      const records = await this.prisma.providerCredential.findMany({
        where: { organizationId },
        select: {
          id: true,
          channel: true,
          provider: true,
          credentials: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { channel: 'asc' },
      });

      const sanitized = records.map((record) => {
        let maskedCreds: Record<string, any> = {};
        try {
          const rawEncrypted = (record.credentials as any)?.encrypted;
          if (rawEncrypted) {
            const decrypted = decryptData<Record<string, any>>(rawEncrypted);
            maskedCreds = this.maskCredentials(decrypted);
          }
        } catch {
          maskedCreds = { error: 'Unable to decrypt' };
        }

        return {
          id: record.id,
          channel: record.channel,
          provider: record.provider,
          credentials: maskedCreds,
          active: record.active,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      });

      return {
        message: 'Provider credentials retrieved successfully.',
        data: sanitized,
      };
    } catch {
      throw new InternalServerErrorException('Failed to retrieve provider credentials.');
    }
  }

  /**
   * Deletes a provider credential configuration for a channel.
   */
  async deleteCredential(organizationId: string, channel: NotificationChannel) {
    try {
      const existing = await this.prisma.providerCredential.findUnique({
        where: {
          organizationId_channel: {
            organizationId,
            channel,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException(`No provider credential configured for channel '${channel}'.`);
      }

      await this.prisma.providerCredential.delete({
        where: {
          organizationId_channel: {
            organizationId,
            channel,
          },
        },
      });

      return {
        message: `Provider credential for channel '${channel}' deleted successfully.`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to delete provider credential.');
    }
  }

  /**
   * Internal method used by dispatching engine to retrieve unencrypted credentials.
   */
  async getDecryptedCredential(organizationId: string, channel: NotificationChannel) {
    const record = await this.prisma.providerCredential.findUnique({
      where: {
        organizationId_channel: {
          organizationId,
          channel,
        },
      },
    });

    if (!record || !record.active) {
      return null;
    }

    const encrypted = (record.credentials as any)?.encrypted;
    if (!encrypted) {
      return null;
    }

    return {
      provider: record.provider,
      credentials: decryptData<Record<string, any>>(encrypted),
    };
  }
}
