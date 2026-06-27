import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReviewDto, ReviewsQueryDto, UpdateReviewDto } from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List reviews' })
  findAll(@Query() query: ReviewsQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a review after a completed appointment' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(dto, user);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a review' })
  update(@Param('id') id: string, @Body() dto: UpdateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.update(id, dto, user);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.remove(id, user);
  }
}
