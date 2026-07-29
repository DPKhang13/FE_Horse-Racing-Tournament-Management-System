# Yeu cau bo sung response API theo DB

Tai lieu nay chi dua tren cac field dang co trong DB. FE se sua lai type va UI de khop voi cac field nay, khong yeu cau backend tra cac field khong ton tai trong DB.

Nguon doi chieu:

- `API_DOCUMENTATION.md`
- `db (1).txt`

## Nguyen tac response chung

Tat ca API list/detail nen tra ve:

- `id` chinh cua entity, map tu khoa chinh trong DB.
- Cac field truc tiep trong bang DB.
- Cac ten hien thi can thiet cho FE bang cach join tu bang lien quan, vi cac id don le khong du de hien thi nghiep vu.
- Timestamp theo ISO string.
- Pagination cho cac API list neu du lieu co the lon.

Response list khuyen nghi:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

## Auth

### `POST /api/auth/login`

Can tra them thong tin user hien tai de FE set session sau login:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "userId": 1,
    "username": "owner01",
    "email": "owner@example.com",
    "fullName": "Horse Owner",
    "phone": "0900000000",
    "roleType": "horse_owner",
    "status": "active",
    "avatarUrl": null,
    "createdAt": "2026-06-13T08:00:00Z"
  }
}
```

### `GET /api/auth/me`

Can tra day du field tu bang `users` va profile theo role neu co.

Field chung:

- `userId`
- `username`
- `email`
- `fullName`
- `phone`
- `roleType`
- `status`
- `avatarUrl`
- `createdAt`

Neu `roleType = horse_owner`, tra them `ownerProfile` tu `horse_owner_profiles`:

- `ownerId`
- `stableName`
- `licenseNumber`
- `address`
- `favoriteJockeyId`
- `status`
- `createdAt`

Neu `roleType = jockey`, tra them `jockeyProfile` tu `jockey_profiles`:

- `jockeyId`
- `licenseNumber`
- `rankingPoints`
- `totalWins`
- `experienceYears`
- `status`

Neu `roleType = race_referee`, tra them `refereeProfile` tu `referee_profiles`:

- `refereeId`
- `licenseNumber`
- `address`
- `status`
- `createdAt`

## Tournaments

### `GET /api/tournaments/getAll`
### `GET /api/tournaments/getId/{tournamentId}`

Can tra day du field tu bang `tournaments`:

- `tournamentId`
- `name`
- `location`
- `startDate`
- `endDate`
- `prizePool`
- `status`
- `createdBy`
- `createdAt`

Can join them nguoi tao:

- `createdByUsername`
- `createdByFullName`

Voi API detail, nen tra them:

- `schedules` tu `tournament_schedules`
- `prizes` tu `prize_distributions`

Field `schedules`:

- `scheduleId`
- `tournamentId`
- `raceDate`
- `dayNumber`
- `title`
- `note`

Field `prizes`:

- `prizeId`
- `tournamentId`
- `finishPosition`
- `prizeName`
- `amount`
- `note`

## Prizes

### `GET /api/v1/admin/tournaments/getId/{tournamentId}`

Can tra:

- `prizeId`
- `tournamentId`
- `finishPosition`
- `prizeName`
- `amount`
- `note`

Can join them tournament:

- `tournamentName`
- `tournamentStatus`
- `prizePool`

## Horses

### `GET /api/horses/get-all`
### `GET /api/horses/ranking`
### `GET /api/horses/get-by-id/{id}`

Can tra dung field co trong bang `horses`:

- `horseId`
- `ownerId`
- `name`
- `breed`
- `age`
- `weightKg`
- `rankGroup`
- `rankingPoints`
- `avatarUrl`
- `totalWins`
- `status`
- `registeredAt`

Can join them thong tin owner de FE hien thi:

- `ownerFullName`
- `ownerEmail`
- `ownerPhone`
- `ownerStableName`
- `ownerLicenseNumber`

Luu y cho FE:

- DB khong co `gender`, `birthDate`, `color`, `height`, `microchipId`, `healthStatus`, `vaccinationDate`, `trainingLevel`, `notes`.
- FE can bo hoac thay bang cac field co san: `age`, `weightKg`, `rankGroup`, `rankingPoints`, `totalWins`, `status`.

## Races

### `GET /api/races/get-by-tournament/{tournamentId}`

DB khong luu truc tiep `tournament_id` trong bang `races`, can join qua `tournament_schedules`.

Can tra field tu `races`:

- `raceId`
- `scheduleId`
- `name`
- `raceNumber`
- `rankGroup`
- `lapCount`
- `scheduledAt`
- `predictionClosesAt`
- `distanceM`
- `trackType`
- `maxHorses`
- `maxReferees`
- `pointRuleNote`
- `status`

Can join them tu `tournament_schedules` va `tournaments`:

- `tournamentId`
- `tournamentName`
- `raceDate`
- `dayNumber`
- `scheduleTitle`
- `scheduleNote`
- `location`

Can tra them so lieu dem de FE biet tinh trang dang ky:

- `registeredHorseCount` tu `race_registrations`
- `acceptedJockeyCount` tu `jockey_horse_assignments` status accepted
- `assignedRefereeCount` tu `race_referee_assignments`

## Jockeys

### `GET /api/jockeys/get-all`
### `GET /api/jockeys/ranking`

Can tra field tu `jockey_profiles`:

- `jockeyId`
- `licenseNumber`
- `rankingPoints`
- `totalWins`
- `experienceYears`
- `status`

Can join them tu `users`:

- `username`
- `email`
- `fullName`
- `phone`
- `avatarUrl`
- `userStatus`
- `createdAt`

Ranking nen tra them:

- `rank`
- `totalRaces` tinh tu `jockey_horse_assignments`
- `winRate` tinh tu `race_results`

## Race Registrations

### `GET /api/race-registrations/get-all`
### `GET /api/race-registrations/get-my-registrations`
### `GET /api/race-registrations/get-by-id/{id}`

Can tra field tu `race_registrations`:

- `regId`
- `tournamentId`
- `raceId`
- `horseId`
- `ownerId`
- `jockeyId`
- `status`
- `ownerConfirmationStatus`
- `ownerConfirmedAt`
- `registeredAt`
- `approvedAt`
- `approvedBy`

Can join them de FE hien thi:

- `tournamentName`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `horseName`
- `horseAvatarUrl`
- `ownerFullName`
- `ownerStableName`
- `jockeyFullName`
- `jockeyStatus`
- `approvedByFullName`

## Jockey Assignments / Invitations

### `GET /api/jockey-assignments/get-all`
### `GET /api/jockey-assignments/get-my-invitations`
### `GET /api/jockey-assignments/get-sent-invitations`
### `GET /api/jockey-assignments/get-by-id/{id}`

Can tra field tu `jockey_horse_assignments`:

- `assignmentId`
- `regId`
- `raceId`
- `jockeyId`
- `gateNumber`
- `status`
- `invitedAt`
- `respondedAt`

Can join them:

- `raceName`
- `raceNumber`
- `scheduledAt`
- `horseId`
- `horseName`
- `horseAvatarUrl`
- `ownerId`
- `ownerFullName`
- `ownerStableName`
- `jockeyFullName`
- `jockeyAvatarUrl`

## Race Results

### `GET /api/race-results/get-all`
### `GET /api/race-results/get-by-id/{id}`

Can tra field tu `race_results`:

- `resultId`
- `assignmentId`
- `raceId`
- `horseId`
- `ownerId`
- `reportId`
- `finalRound`
- `finishPosition`
- `finishTimeSec`
- `pointsAwarded`
- `isDisqualified`
- `disqualifyReason`
- `status`
- `recordedAt`
- `publishedAt`

Can join them:

- `raceName`
- `raceNumber`
- `scheduledAt`
- `distanceM`
- `trackType`
- `tournamentId`
- `tournamentName`
- `location`
- `horseName`
- `horseAvatarUrl`
- `ownerFullName`
- `ownerStableName`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `reportVerdict`

Voi API detail, nen tra them:

- `entries`: danh sach tat ca ket qua trong cung `raceId`
- `prizeDistributions`: danh sach giai thuong cua tournament tu `prize_distributions`
- `prizeAwards`: neu da tao award, lay tu `prize_awards`

## Bets

### `GET /api/bets/get-all`
### `GET /api/bets/get-by-id/{id}`

Can tra field tu `bets`:

- `betId`
- `userId`
- `optionId`
- `betType`
- `betPoints`
- `betRate`
- `rewardPoints`
- `status`
- `placedAt`
- `settledAt`

Can join them tu `bet_options`, `races`, `horses`, `jockey_horse_assignments`, `users`:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `assignmentId`
- `horseId`
- `horseName`
- `currentRate`
- `totalBetPoints`
- `totalBetCount`
- `jockeyId`
- `jockeyFullName`
- `userFullName`

## Rewards

### `PUT /api/rewards/calculate/{betId}`

Sau khi tinh reward, response can tra lai bet da cap nhat:

- `betId`
- `userId`
- `optionId`
- `betPoints`
- `betRate`
- `rewardPoints`
- `status`
- `placedAt`
- `settledAt`

Neu co cap nhat wallet/transaction, can tra them:

- `walletId`
- `pointBalance`
- `transactionId`
- `pointsBefore`
- `pointsAfter`
- `txStatus`

Tat ca field nay deu co trong `wallets` va `wallet_transactions`.

## Notifications

### `GET /api/notifications/get-all`
### `GET /api/notifications/get-by-id/{id}`

Can tra field tu `notifications`:

- `notificationId`
- `userId`
- `title`
- `message`
- `type`
- `refId`
- `refType`
- `isRead`
- `createdAt`

Can join them:

- `userFullName`
- `userRoleType`

## VNPay Payments

### `POST /api/payments/vnpay/create-payment`
### `GET /api/payments/vnpay/return`
### `GET /api/payments/vnpay/ipn`

DB co `wallets` va `wallet_transactions`, vi vay payment response nen tra du thong tin transaction lien quan:

- `txId`
- `walletId`
- `userId`
- `txType`
- `cashAmount`
- `pointsAmount`
- `exchangeRate`
- `pointsBefore`
- `pointsAfter`
- `status`
- `refType`
- `refId`
- `createdBy`
- `createdAt`
- `updatedAt`

Create payment nen tra them:

- `paymentUrl`
- `transactionRef`

## API con thieu so voi DB va nghiep vu FE nen co

### Schedules

Can co API cho `tournament_schedules`:

- `GET /api/tournament-schedules/get-by-tournament/{tournamentId}`
- `GET /api/tournament-schedules/get-by-id/{scheduleId}`
- `POST /api/tournament-schedules/create`
- `PUT /api/tournament-schedules/update/{scheduleId}`
- `DELETE /api/tournament-schedules/delete/{scheduleId}`

Field:

- `scheduleId`
- `tournamentId`
- `raceDate`
- `dayNumber`
- `title`
- `note`
- `tournamentName`

### Race management

Hien API doc chi co get race by tournament. Can them API quan ly race:

- `GET /api/races/get-by-id/{raceId}`
- `POST /api/races/create`
- `PUT /api/races/update/{raceId}`
- `PATCH /api/races/update-status/{raceId}`
- `DELETE /api/races/delete/{raceId}`

Field theo bang `races` va join schedule/tournament nhu muc Races.

### Race referee assignments

Can API cho bang `race_referee_assignments`:

- `GET /api/race-referee-assignments/get-by-race/{raceId}`
- `GET /api/race-referee-assignments/get-my-assignments`
- `POST /api/race-referee-assignments/create`
- `PUT /api/race-referee-assignments/update/{refAssignId}`
- `DELETE /api/race-referee-assignments/delete/{refAssignId}`

Field:

- `refAssignId`
- `raceId`
- `refereeId`
- `refereeRole`
- `assignedAt`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `refereeFullName`
- `refereeLicenseNumber`

### Referee reports

Can API cho bang `referee_reports`:

- `GET /api/referee-reports/get-by-race/{raceId}`
- `GET /api/referee-reports/get-my-reports`
- `GET /api/referee-reports/get-by-id/{reportId}`
- `POST /api/referee-reports/create`
- `PUT /api/referee-reports/update/{reportId}`

Field:

- `reportId`
- `raceId`
- `refereeId`
- `reportType`
- `inspectionNotes`
- `violationNotes`
- `resultNotes`
- `verdict`
- `submittedAt`
- `raceName`
- `refereeFullName`

### Race rounds

Can API cho bang `race_rounds` neu FE can tracking tung vong:

- `GET /api/race-rounds/get-by-race/{raceId}`
- `POST /api/race-rounds/create`
- `PUT /api/race-rounds/update/{roundId}`

Field:

- `roundId`
- `raceId`
- `assignmentId`
- `horseId`
- `roundNumber`
- `position`
- `lapTimeSec`
- `recordedAt`
- `horseName`
- `jockeyFullName`

### Prize awards

Can API cho bang `prize_awards`:

- `GET /api/prize-awards/get-by-tournament/{tournamentId}`
- `GET /api/prize-awards/get-by-race/{raceId}`
- `POST /api/prize-awards/create-from-results/{raceId}`
- `PATCH /api/prize-awards/update-status/{awardId}`

Field:

- `awardId`
- `prizeId`
- `tournamentId`
- `raceId`
- `resultId`
- `horseId`
- `ownerId`
- `finishPosition`
- `amount`
- `status`
- `awardedAt`
- `horseName`
- `ownerFullName`
- `raceName`
- `tournamentName`

### Wallets

Can API cho diem/vi nguoi dung:

- `GET /api/wallets/me`
- `GET /api/wallets/transactions/me`
- `GET /api/admin/wallets/user/{userId}`
- `GET /api/admin/wallet-transactions`

Field `wallets`:

- `walletId`
- `userId`
- `pointBalance`
- `status`
- `createdAt`

Field `wallet_transactions`:

- `txId`
- `walletId`
- `userId`
- `txType`
- `cashAmount`
- `pointsAmount`
- `exchangeRate`
- `pointsBefore`
- `pointsAfter`
- `status`
- `refType`
- `refId`
- `createdBy`
- `createdAt`
- `updatedAt`

### Bet options

Can API de spectator lay option dat cuoc/du doan:

- `GET /api/bet-options/get-by-race/{raceId}`
- `GET /api/bet-options/get-by-id/{optionId}`
- `POST /api/admin/bet-options/create`
- `PUT /api/admin/bet-options/update/{optionId}`

Field:

- `optionId`
- `raceId`
- `assignmentId`
- `horseId`
- `currentRate`
- `totalBetPoints`
- `totalBetCount`
- `updatedAt`
- `raceName`
- `horseName`
- `jockeyFullName`
- `gateNumber`

## API can them de hoan thien cac trang FE

Phan nay gom API theo tung man hinh FE. Tat ca field deu lay truc tiep tu DB, join tu DB, hoac tinh toan tu DB.

### 1. Landing page / Home

Can API lay race noi bat sap dien ra:

- `GET /api/public/home/upcoming-races`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `distanceM`
- `trackType`
- `rankGroup`
- `status`
- `tournamentId`
- `tournamentName`
- `location`
- `registeredHorseCount`
- `favoriteHorseId`
- `favoriteHorseName`
- `favoriteHorseRate`

`favoriteHorse...` la field tinh tu `bet_options`, co the lay option co `currentRate` thap nhat hoac theo rule backend dang dung, khong can them cot DB.

Can API lay top ranking de hien thi o home:

- `GET /api/public/home/rankings`

Field horse ranking:

- `rank`
- `horseId`
- `horseName`
- `avatarUrl`
- `rankGroup`
- `rankingPoints`
- `totalWins`
- `ownerId`
- `ownerFullName`
- `ownerStableName`

Field jockey ranking:

- `rank`
- `jockeyId`
- `jockeyFullName`
- `avatarUrl`
- `rankingPoints`
- `totalWins`
- `experienceYears`
- `status`

### 2. Race Schedule page

Can API list lich dua theo ngay/tournament/status:

- `GET /api/race-schedules`

Query nen co:

- `fromDate`
- `toDate`
- `tournamentId`
- `status`
- `page`
- `pageSize`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `distanceM`
- `trackType`
- `rankGroup`
- `lapCount`
- `maxHorses`
- `status`
- `scheduleId`
- `raceDate`
- `dayNumber`
- `scheduleTitle`
- `tournamentId`
- `tournamentName`
- `location`
- `prizePool`
- `registeredHorseCount`
- `availableBetOptionCount`

Can API detail cua 1 race:

- `GET /api/races/get-detail/{raceId}`

Field:

- Tat ca field cua `GET /api/race-schedules`
- `pointRuleNote`
- `assignments`
- `betOptions`
- `refereeAssignments`

Field `assignments`:

- `assignmentId`
- `regId`
- `horseId`
- `horseName`
- `horseAvatarUrl`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `status`

Field `betOptions`:

- `optionId`
- `assignmentId`
- `horseId`
- `horseName`
- `currentRate`
- `totalBetPoints`
- `totalBetCount`
- `updatedAt`

Field `refereeAssignments`:

- `refAssignId`
- `refereeId`
- `refereeFullName`
- `refereeRole`
- `assignedAt`

### 3. Prediction / Betting page

Can API lay cac race dang mo du doan/dat cuoc:

- `GET /api/predictions/open-races`

Query nen co:

- `status`
- `fromDate`
- `toDate`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `distanceM`
- `trackType`
- `rankGroup`
- `status`
- `tournamentId`
- `tournamentName`
- `location`
- `betOptions`

Field `betOptions`:

- `optionId`
- `assignmentId`
- `horseId`
- `horseName`
- `horseAvatarUrl`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `currentRate`
- `totalBetPoints`
- `totalBetCount`
- `updatedAt`

Can API lay prediction/bet cua user hien tai:

- `GET /api/bets/my-bets`

Query nen co:

- `status`
- `page`
- `pageSize`

Field:

- `betId`
- `userId`
- `optionId`
- `betType`
- `betPoints`
- `betRate`
- `rewardPoints`
- `status`
- `placedAt`
- `settledAt`
- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `horseId`
- `horseName`
- `jockeyId`
- `jockeyFullName`
- `finishPosition`
- `finishTimeSec`
- `isDisqualified`

Can API lay summary prediction cua user:

- `GET /api/bets/my-summary`

Field tinh tu `bets`, `wallets`, `wallet_transactions`:

- `walletId`
- `pointBalance`
- `openBetCount`
- `pendingBetCount`
- `settledBetCount`
- `wonBetCount`
- `lostBetCount`
- `totalBetPoints`
- `totalRewardPoints`
- `netPoints`
- `winRate`

### 4. Result list / Result detail / Ranking page

Can API list race results theo race, khong chi theo tung result id:

- `GET /api/race-results/races`

Query nen co:

- `status`
- `tournamentId`
- `fromDate`
- `toDate`
- `search`
- `page`
- `pageSize`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `status`
- `publishedAt`
- `tournamentId`
- `tournamentName`
- `location`
- `distanceM`
- `trackType`
- `totalPrizePool`
- `winnerHorseId`
- `winnerHorseName`
- `winnerJockeyId`
- `winnerJockeyFullName`
- `winnerFinishTimeSec`
- `topFinishers`

Field `topFinishers`:

- `resultId`
- `finishPosition`
- `horseId`
- `horseName`
- `jockeyId`
- `jockeyFullName`
- `finishTimeSec`
- `pointsAwarded`
- `isDisqualified`

Can API detail ket qua theo race:

- `GET /api/race-results/races/{raceId}`

Field:

- Tat ca field cua list result race
- `entries`
- `raceRounds`
- `refereeReports`
- `prizeDistributions`
- `prizeAwards`

Field `entries`:

- `resultId`
- `assignmentId`
- `horseId`
- `horseName`
- `horseAvatarUrl`
- `ownerId`
- `ownerFullName`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `finalRound`
- `finishPosition`
- `finishTimeSec`
- `pointsAwarded`
- `isDisqualified`
- `disqualifyReason`
- `status`
- `recordedAt`
- `publishedAt`

Can API ranking rieng cho FE:

- `GET /api/rankings/horses`
- `GET /api/rankings/jockeys`
- `GET /api/rankings/owners`

Field horse ranking:

- `rank`
- `horseId`
- `horseName`
- `ownerId`
- `ownerFullName`
- `ownerStableName`
- `rankingPoints`
- `totalWins`
- `totalRaces`
- `winRate`
- `rankGroup`
- `avatarUrl`

Field jockey ranking:

- `rank`
- `jockeyId`
- `jockeyFullName`
- `rankingPoints`
- `totalWins`
- `totalRaces`
- `winRate`
- `experienceYears`
- `avatarUrl`

Field owner ranking:

- `rank`
- `ownerId`
- `ownerFullName`
- `ownerStableName`
- `totalHorses`
- `totalWins`
- `totalRaces`
- `totalPoints`
- `winRate`

### 5. Result Tracking page cua spectator

Can API tracking ket qua cac bet cua user:

- `GET /api/bets/my-result-tracking`

Query nen co:

- `status`
- `fromDate`
- `toDate`
- `page`
- `pageSize`

Field:

- `betId`
- `betPoints`
- `betRate`
- `rewardPoints`
- `betStatus`
- `placedAt`
- `settledAt`
- `raceId`
- `raceName`
- `raceNumber`
- `publishedAt`
- `selectedHorseId`
- `selectedHorseName`
- `selectedJockeyFullName`
- `winnerHorseId`
- `winnerHorseName`
- `winnerFinishTimeSec`
- `selectedFinishPosition`
- `predictionStatus`

`predictionStatus` co the map tu `bets.status`.

Can API summary tracking:

- `GET /api/bets/my-result-summary`

Field:

- `settledBetCount`
- `wonBetCount`
- `lostBetCount`
- `pendingBetCount`
- `totalBetPoints`
- `totalRewardPoints`
- `netPoints`
- `winRate`
- `latestSettledBetId`
- `latestSettledRaceName`
- `latestSettledHorseName`
- `latestSettledAt`

### 6. Spectator Dashboard

Can API tong hop dashboard:

- `GET /api/spectator/dashboard`

Field:

- `wallet`
- `upcomingRaces`
- `myActiveBets`
- `latestResults`
- `notifications`
- `summary`

Field `wallet`:

- `walletId`
- `pointBalance`
- `status`
- `createdAt`

Field `upcomingRaces`:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `predictionClosesAt`
- `status`
- `trackType`
- `tournamentName`
- `location`
- `favoriteHorseId`
- `favoriteHorseName`
- `favoriteHorseRate`

`favoriteHorse...` la field tinh tu `bet_options`, khong can them cot DB.

Field `myActiveBets`:

- `betId`
- `raceId`
- `raceName`
- `horseId`
- `horseName`
- `jockeyFullName`
- `betPoints`
- `betRate`
- `status`
- `placedAt`

Field `latestResults`:

- `raceId`
- `raceName`
- `winnerHorseId`
- `winnerHorseName`
- `winnerFinishTimeSec`
- `publishedAt`
- `prizeAmount`

Field `notifications`:

- `notificationId`
- `title`
- `message`
- `type`
- `refId`
- `refType`
- `isRead`
- `createdAt`

Field `summary`:

- `activeBetCount`
- `pendingBetCount`
- `settledBetCount`
- `wonBetCount`
- `lostBetCount`

### 7. User Profile / Wallet page

Can API update profile chung:

- `PUT /api/users/me`

Body chi nen cho update field co trong `users`:

- `fullName`
- `phone`
- `avatarUrl`

Can API update profile theo role:

- `PUT /api/horse-owner-profiles/me`
- `PUT /api/jockey-profiles/me`
- `PUT /api/referee-profiles/me`

Field owner co the update:

- `stableName`
- `licenseNumber`
- `address`
- `favoriteJockeyId`

Field jockey co the update:

- `licenseNumber`
- `experienceYears`
- `status`

Field referee co the update:

- `licenseNumber`
- `address`
- `status`

Can API giao dich vi:

- `GET /api/wallets/me`
- `GET /api/wallet-transactions/me`
- `POST /api/wallets/deposit`

Field transaction list:

- `txId`
- `walletId`
- `userId`
- `txType`
- `cashAmount`
- `pointsAmount`
- `exchangeRate`
- `pointsBefore`
- `pointsAfter`
- `status`
- `refType`
- `refId`
- `createdAt`
- `updatedAt`

### 8. Horse Owner - Horse Management

API hien co du CRUD horse, nhung can them endpoint lay rieng ngua cua owner hien tai:

- `GET /api/horses/my-horses`

Field:

- `horseId`
- `ownerId`
- `name`
- `breed`
- `age`
- `weightKg`
- `rankGroup`
- `rankingPoints`
- `avatarUrl`
- `totalWins`
- `status`
- `registeredAt`
- `ownerFullName`
- `ownerStableName`
- `ownerEmail`
- `ownerPhone`

Can API lay lich su race cua 1 horse:

- `GET /api/horses/{horseId}/race-history`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `tournamentId`
- `tournamentName`
- `assignmentId`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `finishPosition`
- `finishTimeSec`
- `pointsAwarded`
- `isDisqualified`
- `status`

### 9. Horse Owner - Registration flow

Can API tra cac race ma horse du dieu kien dang ky:

- `GET /api/race-registrations/eligible-races`

Query:

- `horseId`
- `tournamentId`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `rankGroup`
- `distanceM`
- `trackType`
- `maxHorses`
- `registeredHorseCount`
- `status`
- `tournamentId`
- `tournamentName`
- `location`
- `isAlreadyRegistered`
- `canRegister`
- `reason`

`canRegister` va `reason` la field tinh tu DB/rule, khong can them cot DB.

Can API owner confirm registration:

- `PUT /api/race-registrations/owner-confirm/{regId}`

Body:

- `ownerConfirmationStatus`

Response tra lai field race registration nhu muc Race Registrations.

### 10. Jockey Dashboard / Invitations

Can API summary cho jockey:

- `GET /api/jockey/dashboard`

Field:

- `jockeyId`
- `fullName`
- `rankingPoints`
- `totalWins`
- `experienceYears`
- `status`
- `pendingInvitationCount`
- `acceptedAssignmentCount`
- `upcomingRaceCount`
- `recentResults`

Field `recentResults`:

- `resultId`
- `raceId`
- `raceName`
- `horseId`
- `horseName`
- `finishPosition`
- `finishTimeSec`
- `pointsAwarded`
- `publishedAt`

Can API lay lich dua cua jockey:

- `GET /api/jockey/my-races`

Field:

- `assignmentId`
- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `tournamentName`
- `location`
- `horseId`
- `horseName`
- `gateNumber`
- `assignmentStatus`
- `registrationStatus`

### 11. Referee Dashboard / Result input

Can API summary cho referee:

- `GET /api/referee/dashboard`

Field:

- `refereeId`
- `fullName`
- `licenseNumber`
- `status`
- `assignedRaceCount`
- `submittedReportCount`
- `pendingReportCount`
- `upcomingAssignments`

Field `upcomingAssignments`:

- `refAssignId`
- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `tournamentName`
- `location`
- `refereeRole`
- `assignedAt`

Can API lay danh sach assignment cua race de nhap ket qua:

- `GET /api/referee/races/{raceId}/result-input`

Field:

- `raceId`
- `raceName`
- `raceNumber`
- `scheduledAt`
- `status`
- `assignments`
- `existingResults`
- `reports`

Field `assignments`:

- `assignmentId`
- `regId`
- `horseId`
- `horseName`
- `ownerId`
- `ownerFullName`
- `jockeyId`
- `jockeyFullName`
- `gateNumber`
- `assignmentStatus`

Field `existingResults`:

- `resultId`
- `assignmentId`
- `finishPosition`
- `finishTimeSec`
- `pointsAwarded`
- `isDisqualified`
- `disqualifyReason`
- `status`

### 12. Admin Dashboard

Can API tong hop admin:

- `GET /api/admin/dashboard`

Field:

- `totalUsers`
- `totalHorseOwners`
- `totalJockeys`
- `totalReferees`
- `totalSpectators`
- `totalHorses`
- `activeTournamentCount`
- `upcomingRaceCount`
- `pendingRegistrationCount`
- `pendingJockeyInvitationCount`
- `pendingPaymentTransactionCount`
- `totalBetPoints`
- `totalRewardPoints`
- `recentRegistrations`
- `recentTransactions`

Field `recentRegistrations`:

- `regId`
- `tournamentName`
- `raceName`
- `horseName`
- `ownerFullName`
- `jockeyFullName`
- `status`
- `registeredAt`

Field `recentTransactions`:

- `txId`
- `userId`
- `userFullName`
- `txType`
- `cashAmount`
- `pointsAmount`
- `status`
- `createdAt`

### 13. Notifications

API hien co notification CRUD, can them endpoint tien loi cho FE:

- `GET /api/notifications/me`
- `PATCH /api/notifications/mark-all-read`
- `GET /api/notifications/unread-count`

Field `unread-count`:

- `unreadCount`

## Ket luan

Backend khong can bo sung field ngoai DB cho FE hien tai. Thay vao do:

- API can tra day du field DB dang co.
- Cac API list/detail can join them ten hien thi tu bang lien quan.
- FE se sua cac mock/type/UI dang dung field khong co trong DB sang cac field nghiep vu co san nhu `age`, `weightKg`, `rankGroup`, `rankingPoints`, `totalWins`, `status`, `scheduledAt`, `trackType`, `distanceM`, `finishTimeSec`, `pointsAwarded`.
