import { BadRequestException, ValidationError } from '@nestjs/common';

type ValidationErrorsMap = Record<string, string[]>;

export const buildValidationException = (validationErrors: ValidationError[]) => {
  const errors = flattenValidationErrors(validationErrors);

  return new BadRequestException({
    statusCode: 400,
    message: 'Validation failed',
    errors,
  });
};

const flattenValidationErrors = (
  validationErrors: ValidationError[],
  parentPath?: string,
): ValidationErrorsMap => {
  return validationErrors.reduce<ValidationErrorsMap>((acc, error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      acc[path] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(acc, flattenValidationErrors(error.children, path));
    }

    return acc;
  }, {});
};
