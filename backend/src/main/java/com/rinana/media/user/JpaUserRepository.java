package com.rinana.media.user;

import com.rinana.media.common.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JpaUserRepository extends JpaRepository<UserEntity, UUID>, UserRepository {
  @Override
  default Optional<UserEntity> findUserById(UUID id) {
    return findById(id);
  }

  Optional<UserEntity> findByUsername(String username);

  Optional<UserEntity> findByEmail(String email);

  boolean existsByUsername(String username);

  boolean existsByEmail(String email);

  Optional<UserEntity> findByRole(Role role);

  long countByRole(Role role);

  @Override
  default List<UserEntity> findAllUsers() {
    return findAll().stream()
      .sorted(Comparator.comparing(UserEntity::getCreatedAt).reversed())
      .toList();
  }

  @Override
  default UserEntity saveUser(UserEntity user) {
    return save(user);
  }
}
