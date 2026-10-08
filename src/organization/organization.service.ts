import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrganizationDto } from './dto/create-org.dto.js';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

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
}

