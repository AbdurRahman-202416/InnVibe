import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthedRequest } from './auth.guard';
import { AuthService, StaffUser } from './auth.service';

/** Handles /auth/*: staff login and "who am I". */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/login { username, password } -> { token, user } */
  @Post('login')
  login(@Body() body: { username?: string; password?: string }) {
    return this.authService.login(body?.username, body?.password);
  }

  /** GET /auth/me (needs a valid token) -> the signed-in staff user */
  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: AuthedRequest): StaffUser | undefined {
    return request.user;
  }
}
