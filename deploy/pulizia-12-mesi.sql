-- L'informativa privacy dichiara una conservazione massima di 12 mesi per le richieste di contatto.
-- Cancellazione automatica ogni notte (richiede event_scheduler=ON in my.cnf), da eseguire come utente amministratore:
CREATE EVENT IF NOT EXISTS kitty_pulizia_richieste
  ON SCHEDULE EVERY 1 DAY STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR)
  DO DELETE FROM kitty.richieste_contatti WHERE creata_il < (NOW() - INTERVAL 12 MONTH);
-- In alternativa, un cron: mysql -u kitty_admin -p... kitty -e "DELETE FROM richieste_contatti WHERE creata_il < NOW() - INTERVAL 12 MONTH"
