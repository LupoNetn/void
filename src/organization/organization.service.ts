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

    // Hash the password securely using bcrypt (10 rounds salt)
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const organization = await this.prisma.organization.create({
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

      return {
        message: 'Organization created successfully',
        data: organization,
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

      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'supersecretjwtkey',
        expiresIn: '7d',
      });

      const { password: _, ...organizationData } = existingUser;

      return {
        message: 'Login successful',
        token,
        organization: organizationData,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred while logging in.');
    }
  }
}


