import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService, StaffUser } from './auth.service';

/** Request shape we need: the Authorization header in, the staff user out. */
export interface AuthedRequest {
  headers: Record<string, string | undefined>;
  user?: StaffUser;
}

/** Put @UseGuards(AuthGuard) on a route to make it staff-only. Missing or bad token -> 401. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    request.user = await this.authService.requireStaff(request.headers.authorization);
    return true;
  }
}
