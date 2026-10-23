import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrganizationDto } from './dto/create-org.dto.js';
import { LoginDTO } from './dto/login-org.dto.js';
import { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';

import { generateApiKey } from '../common/utils/api-key.util.js';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Helper utility to auto-generate a clean, URL-safe slug from organization name.
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createOrg(dto: CreateOrganizationDto) {
    const { name, email, password, slug: customSlug } = dto;

    // Use provided custom slug or fallback to auto-generated slug
    const slug = customSlug ? customSlug : this.generateSlug(name);

    if (!slug) {
      throw new BadRequestException('Could not generate a valid URL slug from the provided organization name.');
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const { rawKey, prefix, keyHash } = generateApiKey('live');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            email,
            password: hashedPassword,
            slug,
          },
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Create default API Key linked to the organization
        await tx.apiKey.create({
          data: {
            organizationId: organization.id,
            name: 'Default Secret Key',
            prefix,
            keyHash,
          },
        });

        return organization;
      });

      return {
        message: 'Organization created successfully',
        data: result,
        apiKey: rawKey, // Raw key returned ONLY once upon creation
      };
    } catch (error) {
      // Prisma duplicate key / unique constraint error (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];

        if (target.includes('email')) {
          throw new ConflictException('An organization with this email address already exists.');
        }
        if (target.includes('slug')) {
          throw new ConflictException(`The organization slug '${slug}' is already taken.`);
        }
        throw new ConflictException(`An organization with this ${target.join(', ')} already exists.`);
      }

      // Re-throw if already an HTTP Exception
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred while creating the organization.');
    }
  }

  async loginOrg(dto: LoginDTO) {
    const { email, password } = dto;

    try {
      const existingUser = await this.prisma.organization.findUnique({
        where: {
          email,
        },
      });

      if (!existingUser) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const isPasswordValid = await bcrypt.compare(password, existingUser.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      // Payload storing essential organization details
      const payload: OrganizationJwtPayload = {
        sub: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        slug: existingUser.slug,
      };

      const accessToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'supersecretjwtkey',
        expiresIn: '25m',
      });

      const refreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtkey',
        expiresIn: '7d',
      })

      const { password: _, ...organizationData } = existingUser;

      return {
        message: 'Login successful',
        accessToken,
        refreshToken,
        organization: organizationData,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred while logging in.');
    }
  }

  async refreshToken(token: string) {
    try {
      
      const verifiedPayload: OrganizationJwtPayload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtkey',
      })

      const payload: OrganizationJwtPayload = {
        sub: verifiedPayload.sub,
        name: verifiedPayload.name,
        email: verifiedPayload.email,
        slug: verifiedPayload.slug,
      };
  

      if (!payload) {
        throw new UnauthorizedException('Invalid refresh token.')
      }

      const accessToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'supersecretjwtkey',
        expiresIn: '25m',
      })

      const refreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtkey',
        expiresIn: '7d',
      })

      return {
        message: 'Refresh token successful',
        accessToken,
        refreshToken
      }

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred while refreshing the token.')
    }
  }
}


