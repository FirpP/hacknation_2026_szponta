import { CardsRepository } from "@api/cards/repositories/cards.repository";
import { CardsService } from "@api/cards/services/cards.service";

// Composition root modułu cards. Testy tworzą własny CardsService z mockiem repozytorium.
export const cardsService = new CardsService(new CardsRepository());
