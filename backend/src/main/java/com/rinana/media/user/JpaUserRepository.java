package com.rinana.media.user;

import com.rinana.media.common.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
  @Query("""
    select user from UserEntity user
    where user.role <> com.rinana.media.common.Role.SUPER_ADMIN
      and (
        :query is null
        or lower(user.username) like lower(concat('%', :query, '%'))
        or lower(user.email) like lower(concat('%', :query, '%'))
        or lower(user.displayName) like lower(concat('%', :query, '%'))
      )
    """)
  Page<UserEntity> findManageableUsers(@Param("query") String query, Pageable pageable);

  @Override
  default UserEntity saveUser(UserEntity user) {
    return save(user);
  }
}
