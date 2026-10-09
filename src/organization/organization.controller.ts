import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrganizationService } from './organization.service.js';
import { CreateOrganizationDto } from './dto/create-org.dto.js';
import { LoginDTO } from './dto/login-org.dto.js';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return await this.organizationService.createOrg(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginOrganization(
    @Body() dto: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.organizationService.loginOrg(dto);

    // Set secure HTTP-only cookie with JWT token
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Get('me')
  async getProfile(@CurrentOrg() org: OrganizationJwtPayload) {
    return {
      message: 'Profile retrieved successfully',
      organization: org,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    res.clearCookie('org_info');
    return {
      message: 'Logged out successfully',
    };
  }
}
