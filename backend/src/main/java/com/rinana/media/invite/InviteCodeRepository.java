package com.rinana.media.invite;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.UUID;

public interface InviteCodeRepository extends JpaRepository<InviteCodeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<InviteCodeEntity> findByCode(String code);
}
