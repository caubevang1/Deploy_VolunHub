import BaseRepository from "./BaseRepository.js";
import Subscription from "../models/subscription.js";

const SubscriptionRepository = new BaseRepository(Subscription);

export default SubscriptionRepository;
