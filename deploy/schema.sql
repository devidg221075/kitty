-- Tabella delle richieste dal modulo contatti di www.kitty.it  (MySQL 8 / MariaDB 10.6+)
-- 1) Creare database e utenti (cambiare le password):
--      CREATE DATABASE kitty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--      CREATE USER 'kitty_web'@'localhost'   IDENTIFIED BY 'PASSWORD_SITO';      -- usato dal sito: può SOLO inserire
--      CREATE USER 'kitty_admin'@'localhost' IDENTIFIED BY 'PASSWORD_GESTIONE';   -- per leggere/esportare le richieste
-- 2) Eseguire questo file nel database kitty:   mysql -u root -p kitty < deploy/schema.sql
-- 3) Permessi (dopo aver creato la tabella):
--      GRANT INSERT ON kitty.richieste_contatti TO 'kitty_web'@'localhost';
--      GRANT SELECT (id) ON kitty.richieste_contatti TO 'kitty_web'@'localhost';        -- serve a MySQL per l'UPDATE ... WHERE id; espone solo il numero
--      GRANT UPDATE (email_inviata) ON kitty.richieste_contatti TO 'kitty_web'@'localhost';
--      GRANT SELECT, DELETE ON kitty.richieste_contatti TO 'kitty_admin'@'localhost';
--    Così, se il sito venisse compromesso, non si possono leggere le richieste già salvate (solo il numero progressivo).

CREATE TABLE IF NOT EXISTS richieste_contatti (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  creata_il          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lingua             CHAR(2)       NOT NULL DEFAULT 'it',
  azienda            VARCHAR(120)  NOT NULL,
  nome               VARCHAR(80)   NOT NULL,
  cognome            VARCHAR(80)   NOT NULL,
  email              VARCHAR(160)  NOT NULL,
  richiesta          TEXT          NOT NULL,
  consenso_privacy   TINYINT(1)    NOT NULL DEFAULT 0,
  email_inviata      TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_creata_il (creata_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
