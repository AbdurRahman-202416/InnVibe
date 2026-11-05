import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.reviewsService.create(body);
  }

  @UseGuards(AuthGuard)
  @Get()
  list(@Query('q') q?: string, @Query('category') category?: string, @Query('rating') rating?: string) {
    return this.reviewsService.findAll({ q, category, rating });
  }
}
