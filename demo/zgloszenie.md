# Radar Innowacji

Zgłoszenie do zadania „Radar innowacji” (HackNation 2026, Podkarpackie Centrum Innowacji).

## Problem

Wartościowe innowacje powstają w szkołach, na uczelniach, w samorządach i w firmach, ale informacje o nich są rozproszone po stronach internetowych, rejestrach patentowych i raportach projektów. W efekcie dobre rozwiązania nie wychodzą poza miejsce powstania, różne instytucje niezależnie rozwiązują ten sam problem, a nawet znaleziona innowacja nie mówi, co z nią zrobić dalej.

## Proponowane rozwiązanie

Radar Innowacji to narzędzie do odkrywania i analizy innowacji, które już istnieją. Robot automatycznie zbiera rekordy z publicznych polskich źródeł, model AI opisuje każdy z nich jako ujednoliconą kartę innowacji, a jawne reguły oceniają dojrzałość, wskazują rekomendowaną ścieżkę dalszego rozwoju i odbiorców. Wszystko jest dostępne w jednym miejscu, z możliwością wyszukiwania, filtrowania i porównywania. Radar nie jest platformą do zgłaszania pomysłów ani narzędziem do pozyskiwania finansowania.

## Jak to działa

1. **Zebranie danych.** Robot pobiera rekordy z NCBR (wyszukiwarka sukcesów beneficjentów), BazTOL (katalog zasobów technicznych PUT) i Polskiej Platformy Medycznej (patenty). Respektuje `robots.txt`, używa własnego User-Agent i zachowuje przerwy między żądaniami. Zmiana treści źródła powoduje ponowną analizę karty.
2. **Uporządkowanie.** Model AI tworzy kartę: opis, obszar zastosowania, dziedzinę (technologiczna, edukacyjna, administracyjna), poziom wdrożenia, TRL, ocenę wg definicji innowacji z Oslo Manual 2018 oraz oceny innowacyjności, potencjału zastosowania i wiarygodności.
3. **Weryfikacja.** Każde pole ma etykietę „Fakt” (dosłowny cytat ze źródła) albo „Szacunek”. Cytaty są automatycznie sprawdzane w pobranym rekordzie: potwierdzono 4 445 z 4 481 (99,2%).
4. **Rekomendacja.** Jawne reguły na polach karty wyznaczają ścieżkę (komercjalizacja lub licencja, transfer do innych instytucji, pilotaż, dalsze prace B+R, szukanie partnera), grupy odbiorców (inwestorzy, instytucje publiczne, uczelnie, szkoły, firmy i startupy, innowatorzy) oraz mierniki, po których poznamy, że ścieżka zadziałała. Ta sama karta zawsze daje tę samą rekomendację, a uzasadnienie widać na ekranie.
5. **Podobne rozwiązania.** Dla każdej karty Radar pokazuje najbardziej podobne rozwiązania i oznacza możliwe duplikaty (porównanie słów w nazwie, opisie i obszarze zastosowania, TF-IDF). W bazie wykryto 10 par możliwych duplikatów.
6. **Aktualizacja.** Baza odświeża się sama codziennie o 03:00 czasu polskiego, bez ręcznego uruchamiania skryptów.

## Główne funkcje

- Wyszukiwanie po słowach oraz filtry: dziedzina, poziom wdrożenia, TRL, źródło, odbiorcy („Dla kogo”) i rekomendowana ścieżka. Filtry są w adresie strony, więc link do wyniku można udostępnić.
- Widok radaru: dziedzina, poziom wdrożenia i innowacyjność wszystkich kart na jednym wykresie.
- Karta innowacji ze źródłem, cytatami, ocenami, rekomendacją i podobnymi rozwiązaniami.
- REST API z opisem OpenAPI.

## Dane, założenia i ograniczenia

- **Źródła aktywne:** NCBR (316 kart), BazTOL (72), Polska Platforma Medyczna (1). Razem 389 kart, z czego 286 spełnia definicję innowacji wg Oslo Manual 2018 (szacunek modelu).
- **Źródła przygotowane, wymagają dostępu:** EPO i UPRP (API EPO OPS, wymaga klucza aplikacji), PBN (token wydawany instytucjom). Adresy PAN i Interreg wymagają weryfikacji. Źródła bez dostępu są jawnie oznaczone jako pominięte.
- **Ograniczenia:** oceny, TRL i ścieżka to szacunek, a nie certyfikat. Model AI może się mylić, dlatego przy każdej karcie są cytaty i link do źródła. Obszar administracyjny ma w prototypie 0 kart, bo nie podłączono jeszcze źródła z administracji.

## Skalowalność, bezpieczeństwo i integracje

- Ten sam, powtarzalny proces dla każdego źródła. Nowe źródło to osobny moduł, a Prisma pozwala przejść z SQLite na PostgreSQL.
- Aplikacja jest tylko do odczytu, bez logowania i śledzenia użytkowników. Dane pochodzą z publicznych źródeł, a klucze są poza repozytorium.
- REST API z opisem OpenAPI, uruchomienie jednym poleceniem w Dockerze, kod na licencji EUPL-1.2.

## Proponowane mierniki skuteczności

- Czas od wejścia do znalezienia zbliżonego, istniejącego rozwiązania.
- Liczba wdrożeń innowacji opartych o polskie IP.

## Dalszy rozwój

Klucze EPO i PBN oraz źródła z administracji publicznej, widok porównania kart obok siebie, anonimowa analityka zainteresowań i szersze pokrycie uczelni, szkół i samorządów.

## Technologia

Backend: Hono, Prisma, SQLite (Bun). Frontend: React, Vite. Analiza: model zgodny z API OpenAI. Uruchomienie: Docker Compose.

## Materiały

- Prezentacja PDF (10 slajdów): `radar-innowacji-prezentacja.pdf`
- Film (2 min 26 s): `radar-innowacji-demo.mp4`
- Kod: repozytorium GitHub, licencja EUPL-1.2
