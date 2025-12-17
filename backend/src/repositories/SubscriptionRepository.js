import BaseRepository from "./BaseRepository.js";
import Subscription from "../models/subscription.js";

class SubscriptionRepository extends BaseRepository {
  constructor() {
    super(Subscription);
  }
}

export default new SubscriptionRepository();