import { CanActivate, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LearningWriteAvailabilityGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (!this.config.get<boolean>("LEARNING_WRITES_ENABLED", false)) {
      throw new ServiceUnavailableException("Learning progress writes are not enabled");
    }

    return true;
  }
}
