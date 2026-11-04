import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { NewsletterService } from './newsletter.service';

/** POST /newsletter { email } signs a guest up (public). GET /newsletter lists sign-ups (staff only). */
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /** GET /newsletter?q= -> everyone who signed up. STAFF ONLY (needs a token). */
  @UseGuards(AuthGuard)
  @Get()
  list(@Query('q') q?: string) {
    return this.newsletterService.findAll(q);
  }

  @Post()
  subscribe(@Body() body: { email?: string }) {
    return this.newsletterService.subscribe(body?.email);
  }
}
